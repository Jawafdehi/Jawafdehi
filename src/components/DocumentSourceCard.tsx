import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { DocumentSource, DocumentSourceType } from "@/types/jds";
import { DocumentSourceTypeKeys } from "@/types/jds";
import { getSourceTypeBadgeClass } from "@/utils/source-type-badge";

interface DocumentSourceCardProps {
  source: DocumentSource | null;
  sourceId: number;
  itemNumber: number;
  evidenceDescription?: string;
}

const normalizeUrls = (url: string[] | string | null | undefined): string[] => {
  if (!url) return [];
  
  // URL scheme validation - only allow http/https
  const isAllowedScheme = (u: string) => /^https?:\/\//i.test(u.trim());
  
  if (Array.isArray(url)) return url.filter(u => u && isAllowedScheme(u));
  if (typeof url === 'string' && isAllowedScheme(url)) return [url];
  return [];
};

export function DocumentSourceCard({ 
  source, 
  sourceId, 
  itemNumber,
  evidenceDescription
}: DocumentSourceCardProps) {
  const { t } = useTranslation();
  const urls = normalizeUrls(source?.url);
  const hasUrls = urls.length > 0;
  
  // Get source type label with i18n support and fallback for legacy types
  const sourceTypeLabel = source?.source_type 
    ? (DocumentSourceTypeKeys[source.source_type as DocumentSourceType] 
        ? t(DocumentSourceTypeKeys[source.source_type as DocumentSourceType])
        : source.source_type)
    : null;
  const sourceTypeClass = getSourceTypeBadgeClass(source?.source_type);
  
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

            {hasUrls && (
              <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1 md:justify-end">
                {urls.map((url, index) => {
                  const linkText = urls.length > 1 
                    ? t("documentSource.viewSourceN", { n: index + 1 })
                    : t("documentSource.viewSource");
                  const ariaLabel = `${linkText} ${t("documentSource.opensInNewTab")}`;
                  
                  return (
                    <a
                      key={`${index}-${url}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={ariaLabel}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
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
        </div>
      </div>
    </article>
  );
}
