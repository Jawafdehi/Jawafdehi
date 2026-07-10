import { Archive, Download, ExternalLink, FileText, Files, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DocumentPreviewDialog, type PreviewDocument } from "@/components/DocumentPreviewDialog";
import { SourceTypeBadge } from "@/components/SourceTypeBadge";
import { Button } from "@/components/ui/button";
import { materialTail } from "@/services/datalake-api";
import type {
  EvidenceMaterial,
  SourceLink,
  SourceLinkRole,
} from "@/types/jds";

interface DocumentSourceCardProps {
  /**
   * The resolved material embedded on the case-detail evidence entry
   * (`{display_name, material_type, urls}`), or null when not yet available.
   */
  material: EvidenceMaterial | null;
  /** The material @id IRI; used for a stable fallback title/key. */
  materialIri: string;
  itemNumber: number;
  evidenceDescription?: string;
}

// URL scheme validation - only allow http/https
const isAllowedScheme = (u: string) => /^https?:\/\//i.test(u.trim());

const KNOWN_ROLES: SourceLinkRole[] = [
  "RAW",
  "PERMALINK",
  "MARKDOWN",
  "SOURCE_PAGE",
  "ALTERNATE",
];

// web.archive.org / archive.org snapshot URLs are permalinks by nature. Some
// records mis-tag these as RAW (importer bug), so we override the stated role
// from the URL itself to keep the UI correct regardless of bad data.
const isArchiveUrl = (link: string) =>
  /^https?:\/\/(web\.)?archive\.org\//i.test(link.trim());

const getFileExtension = (link: string) => {
  try {
    const pathname = new URL(link).pathname;
    const lastSegment = pathname.split("/").pop() ?? "";
    return lastSegment.includes(".") ? lastSegment.split(".").pop()?.toLowerCase() ?? "" : "";
  } catch {
    return "";
  }
};

const normalizeRole = (
  role: string | null | undefined,
  link: string,
): SourceLinkRole => {
  if (isArchiveUrl(link)) return "PERMALINK";
  return role && (KNOWN_ROLES as string[]).includes(role) ? (role as SourceLinkRole) : "RAW";
};

/**
 * Build a clean, role-tagged list of links from a material's `urls` field.
 *
 * `urls` is the canonical source of links: each entry is a `{link, role}` dict
 * with an explicit role (RAW/MARKDOWN/PERMALINK). Invalid or non-http(s)
 * entries are dropped.
 */
const resolveLinks = (material: EvidenceMaterial | null): SourceLink[] => {
  if (!material || !Array.isArray(material.urls)) return [];

  return material.urls
    .filter((u): u is SourceLink => Boolean(u?.link) && isAllowedScheme(u.link))
    .map((u) => ({ link: u.link.trim(), role: normalizeRole(u.role, u.link) }));
};

/**
 * Split links into prominent primary links, de-emphasized secondary links
 * (markdown text version(s) + alternate-format renderings), and so on.
 *
 * The backend over-tags the markdown text version's S3 URL: the same URL often
 * appears BOTH as MARKDOWN and again as RAW/PERMALINK. Any non-markdown link
 * pointing at a markdown URL is therefore the text version itself, not a separate
 * source — collapse it into the text version (rendered once, as small text). The
 * remaining links are then deduped by URL so a link tagged twice (e.g.
 * RAW + PERMALINK on the same href) renders a single button.
 *
 * ALTERNATE links (an alternate file format of the RAW document, e.g. a .doc
 * next to the canonical .pdf) are split out into their own small secondary row,
 * since they are redundant content the reader rarely needs.
 */
const partitionLinks = (links: SourceLink[]) => {
  const markdownHrefs = new Set<string>();
  const markdownLinks = links.filter((l) => {
    if (l.role !== "MARKDOWN" || markdownHrefs.has(l.link)) return false;
    markdownHrefs.add(l.link);
    return true;
  });

  const rawLinks: SourceLink[] = [];
  const sourcePageLinks: SourceLink[] = [];
  const permalinkLinks: SourceLink[] = [];
  const alternateLinks: SourceLink[] = [];
  const seen = new Set<string>();
  for (const l of links) {
    if (l.role === "MARKDOWN" || markdownHrefs.has(l.link)) continue;
    if (seen.has(l.link)) continue;
    seen.add(l.link);
    if (l.role === "ALTERNATE") {
      alternateLinks.push(l);
    } else if (l.role === "SOURCE_PAGE") {
      sourcePageLinks.push(l);
    } else if (l.role === "PERMALINK") {
      permalinkLinks.push(l);
    } else {
      rawLinks.push(l);
    }
  }

  return { rawLinks, sourcePageLinks, permalinkLinks, alternateLinks, markdownLinks };
};

type SourceAction = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  previewType?: PreviewDocument["type"];
};

const getPreviewType = (link: SourceLink): PreviewDocument["type"] | undefined => {
  const extension = getFileExtension(link.link);

  if (extension === "pdf") return "pdf";
  if (link.role === "MARKDOWN" || extension === "md" || extension === "markdown") {
    return "markdown";
  }

  return undefined;
};

const isDownloadOnlyFile = (link: SourceLink) => {
  const extension = getFileExtension(link.link);

  return extension === "doc" || extension === "docx";
};

const getPrimaryActionLabel = (link: SourceLink, t: (key: string) => string) => {
  const previewType = getPreviewType(link);

  if (previewType === "pdf") return t("documentSource.role.previewPdf");
  if (previewType === "markdown") return t("documentSource.role.previewMarkdown");

  return t("documentSource.role.raw");
};

const getFileActionLabelKey = (link: SourceLink) => {
  const extension = getFileExtension(link.link);

  if (extension === "pdf") return "documentSource.role.pdf";
  if (extension === "docx") return "documentSource.role.downloadDocx";
  if (extension === "doc") return "documentSource.role.downloadDoc";
  if (extension === "md" || extension === "markdown") return "documentSource.role.markdownFile";

  return "documentSource.role.openFile";
};

export function DocumentSourceCard({
  material,
  materialIri,
  evidenceDescription,
}: DocumentSourceCardProps) {
  const { t } = useTranslation();
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null);
  const links = resolveLinks(material);
  const printLinks = links.filter(
    (link, index, allLinks) => allLinks.findIndex((candidate) => candidate.link === link.link) === index,
  );
  const { rawLinks, sourcePageLinks, permalinkLinks, alternateLinks, markdownLinks } = partitionLinks(links);

  // The material shape carries no free-text description ("cases own no
  // documents"), so the per-case evidence note is the only description channel:
  // short notes render as a byline, long ones as the main paragraph.
  const hasEvidenceDesc = Boolean(evidenceDescription?.trim() && evidenceDescription.trim() !== ".");

  let mainDescription = "";
  let byline = "";

  if (hasEvidenceDesc) {
    const evDesc = evidenceDescription!.trim();
    if (evDesc.length < 120) {
      byline = evDesc;
    } else {
      mainDescription = evDesc;
    }
  }

  const visibleOriginalLink = sourcePageLinks[0] ?? rawLinks.find((link) => !isDownloadOnlyFile(link)) ?? null;
  const visiblePreviewLink = sourcePageLinks[0] ? rawLinks.find((link) => getPreviewType(link)) ?? null : null;
  const visiblePermalinkLink = permalinkLinks[0] ?? null;
  const visibleActions: SourceAction[] = [];
  const menuActions: SourceAction[] = [];

  if (visibleOriginalLink) {
    const previewType = getPreviewType(visibleOriginalLink);

    visibleActions.push({
      href: visibleOriginalLink.link,
      icon: previewType ? FileText : ExternalLink,
      label: getPrimaryActionLabel(visibleOriginalLink, t),
      previewType,
    });
  }

  if (visiblePreviewLink && visiblePreviewLink.link !== visibleOriginalLink?.link) {
    visibleActions.push({
      href: visiblePreviewLink.link,
      icon: FileText,
      label: getPrimaryActionLabel(visiblePreviewLink, t),
      previewType: getPreviewType(visiblePreviewLink),
    });
  }

  const visibleActionHrefs = new Set(visibleActions.map((action) => action.href));

  sourcePageLinks.slice(1).forEach((link, index) => {
    if (visibleActionHrefs.has(link.link)) return;

    const previewType = getPreviewType(link);

    menuActions.push({
      href: link.link,
      icon: previewType ? FileText : ExternalLink,
      label: t("documentSource.role.rawN", { n: index + 2 }),
      previewType,
    });
  });

  rawLinks.forEach((link, index) => {
    if (visibleActionHrefs.has(link.link)) return;

    const labelKey = getFileActionLabelKey(link);

    menuActions.push({
      href: link.link,
      icon: labelKey.includes("download") ? Download : Files,
      label: rawLinks.length > 1 ? t(`${labelKey}N`, { n: index + 1, defaultValue: t(labelKey) }) : t(labelKey),
      previewType: getPreviewType(link),
    });
  });

  permalinkLinks.forEach((link, index) => {
    if (visiblePermalinkLink?.link === link.link) return;

    menuActions.push({
      href: link.link,
      icon: Archive,
      label:
        permalinkLinks.length > 1
          ? t("documentSource.role.permalinkN", { n: index + 1 })
          : t("documentSource.role.permalink"),
    });
  });

  markdownLinks.forEach((link, index) => {
    menuActions.push({
      href: link.link,
      icon: FileText,
      label:
        markdownLinks.length > 1
          ? t("documentSource.role.markdownN", { n: index + 1 })
          : t("documentSource.role.markdown"),
      previewType: getPreviewType(link),
    });
  });

  alternateLinks.forEach((link, index) => {
    const labelKey = getFileActionLabelKey(link);

    menuActions.push({
      href: link.link,
      icon: labelKey.includes("download") ? Download : Files,
      label:
        alternateLinks.length > 1
          ? t(`${labelKey}N`, { n: index + 1, defaultValue: t(labelKey) })
          : t(labelKey),
      previewType: getPreviewType(link),
    });
  });

  const openPreview = (action: SourceAction) => {
    if (!action.previewType) return;

    setPreviewDocument({
      title: action.label,
      type: action.previewType,
      url: action.href,
    });
  };

  return (
    <>
      <article className="hidden print:block">
        <h3 className="print-source-title">{material?.display_name || t("documentSource.fallbackTitle", { id: materialIri })}</h3>
        {evidenceDescription?.trim() ? <p>{evidenceDescription.trim()}</p> : null}
        {printLinks.length ? (
          <ul>
            {printLinks.map((link) => (
              <li key={link.link}>
                <a href={link.link}>{link.link}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      <article className="print:hidden border-b border-border/70 py-6 md:py-8 first:pt-0 last:pb-0 last:border-b-0">
        <div className="flex min-w-0 items-start gap-3">

          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="font-semibold leading-snug text-primary/90 text-lg md:text-xl break-words">
                    {materialIri ? (
                      <Link
                        to={`/material/${materialTail(materialIri)}`}
                        className="rounded-sm underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {material?.display_name || t("documentSource.fallbackTitle", { id: materialIri })}
                      </Link>
                    ) : (
                      material?.display_name || t("documentSource.fallbackTitle", { id: materialIri })
                    )}
                  </h3>
                  <SourceTypeBadge sourceType={material?.material_type} />
                </div>
              </div>
            </div>

            {byline && (
              <p className="mt-1 text-sm font-normal leading-relaxed text-primary/65 break-words">
                {byline}
              </p>
            )}

            {mainDescription && (
              <p className={`font-paragraph break-words ${byline ? "mt-2.5" : "mt-2"}`}>
                {mainDescription}
              </p>
            )}

            {(visibleActions.length > 0 || menuActions.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {visibleActions.map((action) => {
                  const Icon = action.icon;
                  const ariaLabel = action.previewType
                    ? t("documentPreview.previewAria", { title: action.label })
                    : `${action.label} ${t("documentSource.opensInNewTab")}`;

                  if (action.previewType) {
                    return (
                      <Button
                        key={`${action.label}-${action.href}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs font-semibold"
                        aria-label={ariaLabel}
                        onClick={() => openPreview(action)}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {action.label}
                      </Button>
                    );
                  }

                  return (
                    <Button
                      key={`${action.label}-${action.href}`}
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full px-3 text-xs font-semibold"
                    >
                      <a
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={ariaLabel}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {action.label}
                      </a>
                    </Button>
                  );
                })}

                {visiblePermalinkLink && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  >
                    <a
                      href={visiblePermalinkLink.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t("documentSource.role.permalink")} ${t("documentSource.opensInNewTab")}`}
                    >
                      <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("documentSource.role.permalinkShort")}
                    </a>
                  </Button>
                )}

                {menuActions.map((action) => {
                  const Icon = action.icon;
                  const ariaLabel = action.previewType
                    ? t("documentPreview.previewAria", { title: action.label })
                    : `${action.label} ${t("documentSource.opensInNewTab")}`;

                  if (action.previewType) {
                    return (
                      <Button
                        key={`${action.label}-${action.href}`}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        aria-label={ariaLabel}
                        onClick={() => openPreview(action)}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {action.label}
                      </Button>
                    );
                  }

                  return (
                    <Button
                      key={`${action.label}-${action.href}`}
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    >
                      <a
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={ariaLabel}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {action.label}
                      </a>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </article>

      <DocumentPreviewDialog
        document={previewDocument}
        open={Boolean(previewDocument)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDocument(null);
          }
        }}
      />
    </>
  );
}
