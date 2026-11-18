import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { archiveTotal, documentSourcesQuery, listedSources, publisherGroups } from "@/lib/document-sources";
import { formatArchiveCount } from "@/lib/materials-landing";

/** How many offices the summary names before pointing to the full list. */
const TOP_PUBLISHERS = 5;

/**
 * "Where the evidence comes from", as a summary of the one source list on
 * /materials#sources, read from the same `/api/document-sources/` catalogue.
 * It used to be a second, hard-coded table of institutions here that lumped
 * every source it did not know into "Other"; the list now lives in one place.
 */
export function SourcesSummary() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data } = useQuery({ ...documentSourcesQuery(), staleTime: 5 * 60 * 1000 });
  const groups = publisherGroups(data, language);
  const total = archiveTotal(data);
  if (!groups.length || total === null) return null;

  return (
    <section className="border-t border-border pt-10" aria-labelledby="sources-summary-heading">
      <h2
        id="sources-summary-heading"
        className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight"
      >
        {t("dataQuality.materialsBySource.heading")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t("dataQuality.materialsBySource.summary", {
          total: formatArchiveCount(total, language),
          sources: formatArchiveCount(listedSources(data).length, language),
          publishers: formatArchiveCount(groups.length, language),
        })}
      </p>
      <ol className="mt-6 max-w-xl list-none divide-y divide-border border-y border-border">
        {groups.slice(0, TOP_PUBLISHERS).map((group) => (
          <li key={group.key} className="flex items-baseline justify-between gap-4 py-2 text-sm">
            <span className="text-foreground">{group.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatArchiveCount(group.count, language)}
            </span>
          </li>
        ))}
      </ol>
      <Link
        to="/materials/#sources"
        className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent"
      >
        {t("dataQuality.materialsBySource.seeAll")}
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </section>
  );
}
