import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import {
  documentSourcesQuery,
  listedSources,
  sourceBrowseHref,
  type BilingualLabel,
} from "@/lib/document-sources";
import { formatArchiveCount } from "@/lib/materials-landing";

function pick(label: BilingualLabel | null, nepali: boolean): string {
  return (nepali ? label?.ne || label?.en : label?.en || label?.ne) ?? "";
}

/**
 * Every source the archive holds, with its live count, straight from
 * `/api/document-sources/`. The curated shelves above are a short list; this is
 * the complete one, so a newly loaded source (Revenue Investigation, SEBON…)
 * is listed and browsable the moment the API serves it.
 */
export function AllSourcesList() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const nepali = Boolean(language?.startsWith("ne"));
  const { data, isPending, isError } = useQuery({
    ...documentSourcesQuery(),
    staleTime: 5 * 60 * 1000,
  });
  const sources = listedSources(data);

  if (isError) return null;

  return (
    <div>
      <h2 id="sources-heading" className="font-archive-section-title">
        {t("materialsLanding.sources.title", "Every source in the archive")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {t(
          "materialsLanding.sources.lede",
          "Every office and publication we hold documents from, largest first. New sources appear here as soon as they are added.",
        )}
      </p>
      {isPending ? (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <ul className="mt-8 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((row) => {
            const name = pick(row.name, nepali);
            const publisher = pick(row.publisher, nepali);
            return (
              <li key={row.source}>
                <Link
                  to={sourceBrowseHref(row.source)}
                  data-source={row.source}
                  className="group flex h-full items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground group-hover:text-primary">
                      {name}
                    </span>
                    {publisher && publisher !== name && (
                      <span className="block truncate text-xs text-muted-foreground">{publisher}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-muted-foreground">
                    {formatArchiveCount(row.count, language)}
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
