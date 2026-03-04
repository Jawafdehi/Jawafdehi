import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DocumentSource, DocumentSourceType } from "@/types/jds";
import { DocumentSourceTypeKeys } from "@/types/jds";

interface DocumentSourceCardProps {
  source: DocumentSource | null;
  sourceId: number;
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
  
  return (
    <article className="flex items-start p-4 border rounded-lg">
      <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <h3 className="font-medium mb-1">
          {source?.title || t("documentSource.fallbackTitle", { id: sourceId })}
        </h3>
        
        {/* Show Source Type */}
        {sourceTypeLabel && (
          <p className="text-sm text-muted-foreground mb-2">
            {sourceTypeLabel}
          </p>
        )}
        
        {/* Show source description if available */}
        {source?.description && (
          <p className="text-sm text-muted-foreground mb-2">
            {source.description}
          </p>
        )}
        
        {/* Show evidence description */}
        {evidenceDescription && (
          <p className="text-sm text-muted-foreground mb-2">
            {evidenceDescription}
          </p>
        )}
        
        {hasUrls && (
          <div className="flex flex-wrap gap-2 mt-2">
            {urls.map((url, index) => {
              const linkText = urls.length > 1 
                ? t("documentSource.viewSourceN", { n: index + 1 })
                : t("documentSource.viewSource");
              const ariaLabel = `${linkText} ${t("documentSource.opensInNewTab")}`;
              
              return (
                <Button 
                  key={`${index}-${url}`}
                  variant="outline" 
                  size="sm" 
                  asChild
                >
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={ariaLabel}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                    {linkText}
                  </a>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
