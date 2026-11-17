import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  documentSourcesQuery,
  listedSources,
  pickLabel,
  sourceBrowseHref,
} from "@/lib/document-sources";
import { formatArchiveCount } from "@/lib/materials-landing";

/**
 * Every source the archive holds, with its live count, straight from
 * `/api/document-sources/`. The curated shelves above are a short list; this is
 * the complete one, so a newly loaded source (Revenue Investigation, SEBON…)
 * is listed and browsable the moment the API serves it.
 */
export function AllSourcesList() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data } = useQuery({
    ...documentSourcesQuery(),
    staleTime: 5 * 60 * 1000,
  });
  const sources = listedSources(data);

  // Nothing until the list arrives (the pre-rendered page already carries it),
  // and nothing at all if the request fails: no empty heading.
  if (sources.length === 0) return null;

  return (
    <div>
      {/* The series shelf's heading scale, just above it on the page. */}
      <h2 id="sources-heading" className="font-home-display text-3xl text-primary md:text-4xl">
        {t("materialsLanding.sources.title")}
      </h2>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-muted-foreground">
        {t("materialsLanding.sources.lede")}
      </p>
      <ul className="mt-8 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((row) => {
            const name = pickLabel(row.name, language);
            const publisher = pickLabel(row.publisher, language);
            return (
              <li key={row.source}>
                <Link
                  to={sourceBrowseHref(row.source)}
                  data-source={row.source}
                  className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block text-base leading-6 text-primary transition-colors group-hover:text-accent">
                      {name}
                    </span>
                    {publisher && publisher !== name && (
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">{publisher}</span>
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
    </div>
  );
}
