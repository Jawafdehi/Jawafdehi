import { Archive, ExternalLink, FileText, Files, Globe } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type {
  DocumentSourceType,
  EvidenceMaterial,
  SourceLink,
  SourceLinkRole,
} from "@/types/jds";
import { DocumentSourceTypeKeys } from "@/types/jds";
import { getSourceTypeBadgeClass } from "@/utils/source-type-badge";

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

// Roles rendered as prominent primary links (a labelled button row).
type PrimaryRole = "RAW" | "PERMALINK" | "SOURCE_PAGE";

// Visual treatment per role: icon + i18n label key for the prominent links.
const PRIMARY_ROLE_META: Record<
  PrimaryRole,
  { icon: ComponentType<{ className?: string }>; labelKey: string }
> = {
  RAW: { icon: ExternalLink, labelKey: "documentSource.role.raw" },
  PERMALINK: { icon: Archive, labelKey: "documentSource.role.permalink" },
  SOURCE_PAGE: { icon: Globe, labelKey: "documentSource.role.sourcePage" },
};

/**
 * Split links into prominent primary links, de-emphasized secondary links
 * (markdown transcript(s) + alternate-format renderings), and so on.
 *
 * The backend over-tags the markdown transcript's S3 URL: the same URL often
 * appears BOTH as MARKDOWN and again as RAW/PERMALINK. Any non-markdown link
 * pointing at a markdown URL is therefore the transcript itself, not a separate
 * source — collapse it into the transcript (rendered once, as small text). The
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

  const primaryLinks: SourceLink[] = [];
  const alternateLinks: SourceLink[] = [];
  const seen = new Set<string>();
  for (const l of links) {
    if (l.role === "MARKDOWN" || markdownHrefs.has(l.link)) continue;
    if (seen.has(l.link)) continue;
    seen.add(l.link);
    if (l.role === "ALTERNATE") {
      alternateLinks.push(l);
    } else {
      primaryLinks.push(l);
    }
  }

  return { primaryLinks, alternateLinks, markdownLinks };
};

export function DocumentSourceCard({
  material,
  materialIri,
  itemNumber,
  evidenceDescription,
}: DocumentSourceCardProps) {
  const { t } = useTranslation();
  const links = resolveLinks(material);
  const { primaryLinks, alternateLinks, markdownLinks } = partitionLinks(links);

  // The material's type drives the source-type badge/tiering (it carries the
  // same DocumentSourceType vocabulary as the former DocumentSource.source_type).
  const materialType = material?.material_type ?? null;

  // Get source type label with i18n support and fallback for legacy types
  const sourceTypeLabel = materialType
    ? DocumentSourceTypeKeys[materialType as DocumentSourceType]
      ? t(DocumentSourceTypeKeys[materialType as DocumentSourceType])
      : materialType
    : null;
  const sourceTypeClass = getSourceTypeBadgeClass(materialType);

  // Only number a given role's links when there's more than one of that role,
  // so a lone "View original" doesn't get an awkward "1" suffix.
  const primaryRoleCounts = primaryLinks.reduce<Record<string, number>>((acc, l) => {
    acc[l.role] = (acc[l.role] ?? 0) + 1;
    return acc;
  }, {});
  const primaryRoleSeen: Record<string, number> = {};

  return (
    <article className="border-b border-border/70 py-3 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {itemNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="font-medium leading-snug text-foreground break-words">
                  {material?.display_name || t("documentSource.fallbackTitle", { id: materialIri })}
                </h3>
                {sourceTypeLabel && (
                  <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-xs font-medium ${sourceTypeClass}`}>
                    {sourceTypeLabel}
                  </Badge>
                )}
              </div>
            </div>

            {primaryLinks.length > 0 && (
              <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1 md:justify-end">
                {primaryLinks.map((link, index) => {
                  const meta = PRIMARY_ROLE_META[link.role as PrimaryRole] ?? PRIMARY_ROLE_META.RAW;
                  const Icon = meta.icon;
                  const isNumbered = primaryRoleCounts[link.role] > 1;
                  const n = (primaryRoleSeen[link.role] = (primaryRoleSeen[link.role] ?? 0) + 1);
                  const baseLabel = t(meta.labelKey);
                  const linkText = isNumbered ? `${baseLabel} ${n}` : baseLabel;
                  const ariaLabel = `${linkText} ${t("documentSource.opensInNewTab")}`;

                  return (
                    <a
                      key={`${index}-${link.link}`}
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={ariaLabel}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      {linkText}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {evidenceDescription && evidenceDescription.trim() !== '.' && evidenceDescription.trim() && (
            <p className="mt-2 text-sm leading-6 text-muted-foreground break-words">
              {evidenceDescription}
            </p>
          )}

          {alternateLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {alternateLinks.map((link, index) => {
                const linkText =
                  alternateLinks.length > 1
                    ? t("documentSource.role.alternateN", { n: index + 1 })
                    : t("documentSource.role.alternate");
                const ariaLabel = `${linkText} ${t("documentSource.opensInNewTab")}`;

                return (
                  <a
                    key={`alt-${index}-${link.link}`}
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={ariaLabel}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    <Files className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    {linkText}
                  </a>
                );
              })}
            </div>
          )}

          {markdownLinks.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {markdownLinks.map((link, index) => {
                const linkText =
                  markdownLinks.length > 1
                    ? t("documentSource.role.markdownN", { n: index + 1 })
                    : t("documentSource.role.markdown");
                const ariaLabel = `${linkText} ${t("documentSource.opensInNewTab")}`;

                return (
                  <a
                    key={`md-${index}-${link.link}`}
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={ariaLabel}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    <FileText className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    {linkText}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
