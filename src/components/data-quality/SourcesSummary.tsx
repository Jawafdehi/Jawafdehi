import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { folderHref, nodeCount, nodeName, withUnfiled } from "@/data/archive-folders";
import { archiveTotal, documentSourcesQuery, listedSources } from "@/lib/document-sources";
import { formatArchiveCount } from "@/lib/materials-landing";

/**
 * "Where the evidence comes from", as a summary of the archive folder tree on
 * /materials, read from the same `/api/document-sources/` catalogue: the
 * totals, then each top-level folder with its count, linking into it.
 */
export function SourcesSummary() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data } = useQuery({ ...documentSourcesQuery(), staleTime: 5 * 60 * 1000 });
  const total = archiveTotal(data);
  if (total === null) return null;
  const folders = withUnfiled(data, language);

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
          folders: formatArchiveCount(folders.length, language),
        })}
      </p>
      <ol className="mt-6 max-w-xl list-none divide-y divide-border border-y border-border">
        {folders.map((folder) => (
          <li key={folder.slug}>
            <Link
              to={folderHref([folder.slug])}
              className="flex items-baseline justify-between gap-4 py-2 text-sm hover:text-primary"
            >
              <span className="text-foreground">{nodeName(folder, language)}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatArchiveCount(nodeCount(folder, data) ?? 0, language)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        to="/materials/#archive"
        className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent"
      >
        {t("dataQuality.materialsBySource.seeAll")}
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </section>
  );
}
