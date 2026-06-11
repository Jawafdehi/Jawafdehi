import { Archive, ExternalLink, FileText } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type {
  DocumentSource,
  DocumentSourceType,
  SourceLink,
  SourceLinkRole,
} from "@/types/jds";
import { DocumentSourceTypeKeys } from "@/types/jds";
import { getSourceTypeBadgeClass } from "@/utils/source-type-badge";

interface DocumentSourceCardProps {
  source: DocumentSource | null;
  sourceId: number;
  itemNumber: number;
  evidenceDescription?: string;
}

// URL scheme validation - only allow http/https
const isAllowedScheme = (u: string) => /^https?:\/\//i.test(u.trim());

const KNOWN_ROLES: SourceLinkRole[] = ["RAW", "PERMALINK", "MARKDOWN"];

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
 * Build a clean, role-tagged list of links from a source's `urls` field.
 *
 * `urls` is the canonical source of links: each entry is a `{link, role}` dict
 * with an explicit role (RAW/MARKDOWN/PERMALINK). Invalid or non-http(s)
 * entries are dropped.
 */
const resolveLinks = (source: DocumentSource | null): SourceLink[] => {
  if (!source || !Array.isArray(source.urls)) return [];

  return source.urls
    .filter((u): u is SourceLink => Boolean(u?.link) && isAllowedScheme(u.link))
    .map((u) => ({ link: u.link.trim(), role: normalizeRole(u.role, u.link) }));
};

// Visual treatment per role: icon + i18n label key for the prominent links.
const PRIMARY_ROLE_META: Record<
  "RAW" | "PERMALINK",
  { icon: ComponentType<{ className?: string }>; labelKey: string }
> = {
  RAW: { icon: ExternalLink, labelKey: "documentSource.role.raw" },
  PERMALINK: { icon: Archive, labelKey: "documentSource.role.permalink" },
};

/**
 * Split links into the prominent primary links and the markdown transcript(s).
 *
 * The backend over-tags the markdown transcript's S3 URL: the same URL often
 * appears BOTH as MARKDOWN and again as RAW/PERMALINK. Any non-markdown link
 * pointing at a markdown URL is therefore the transcript itself, not a separate
 * source — collapse it into the transcript (rendered once, as small text). The
 * remaining primary links are then deduped by URL so a link tagged twice (e.g.
 * RAW + PERMALINK on the same href) renders a single button.
 */
const partitionLinks = (links: SourceLink[]) => {
  const markdownHrefs = new Set<string>();
  const markdownLinks = links.filter((l) => {
    if (l.role !== "MARKDOWN" || markdownHrefs.has(l.link)) return false;
    markdownHrefs.add(l.link);
    return true;
  });

  const primaryLinks: SourceLink[] = [];
  const seen = new Set<string>();
  for (const l of links) {
    if (l.role === "MARKDOWN" || markdownHrefs.has(l.link)) continue;
    if (seen.has(l.link)) continue;
    seen.add(l.link);
    primaryLinks.push(l);
  }

  return { primaryLinks, markdownLinks };
};

export function DocumentSourceCard({
  source,
  sourceId,
  itemNumber,
  evidenceDescription,
}: DocumentSourceCardProps) {
  const { t } = useTranslation();
  const links = resolveLinks(source);
  const { primaryLinks, markdownLinks } = partitionLinks(links);

  // Get source type label with i18n support and fallback for legacy types
  const sourceTypeLabel = source?.source_type
    ? DocumentSourceTypeKeys[source.source_type as DocumentSourceType]
      ? t(DocumentSourceTypeKeys[source.source_type as DocumentSourceType])
      : source.source_type
    : null;
  const sourceTypeClass = getSourceTypeBadgeClass(source?.source_type);

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
                  {source?.title || t("documentSource.fallbackTitle", { id: sourceId })}
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
                  const meta = PRIMARY_ROLE_META[link.role as "RAW" | "PERMALINK"] ?? PRIMARY_ROLE_META.RAW;
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

          {source?.description && source.description.trim() !== '.' && source.description.trim() && (
            <p className="mt-1 text-sm leading-5 text-muted-foreground break-words">
              {source.description}
            </p>
          )}

          {evidenceDescription && evidenceDescription.trim() !== '.' && evidenceDescription.trim() && (
            <p className="mt-2 text-sm leading-6 text-muted-foreground break-words">
              {evidenceDescription}
            </p>
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
