import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  folderHref,
  leafHref,
  nodeCount,
  nodeName,
  withUnfiled,
} from "@/data/archive-folders";
import {
  archiveTotal,
  documentSourcesQuery,
  listedSources,
  type DocumentSourcesResponse,
} from "@/lib/document-sources";
import { flatten, splitColumns, type CoverageRow } from "@/lib/coverage-rows";
import { formatArchiveCount } from "@/lib/materials-landing";

const ROW = "flex items-baseline justify-between gap-4 py-2 text-sm";

function CoverageRowLink({
  row,
  catalogue,
  language,
}: Readonly<{ row: CoverageRow; catalogue: DocumentSourcesResponse | undefined; language: string }>) {
  const { node, path, depth } = row;
  const top = depth === 0;
  return (
    <Link
      to={node.type === "branch" ? folderHref(path) : leafHref(node)}
      className={`${ROW} hover:text-primary ${
        top ? "font-semibold text-foreground" : "text-foreground/90"
      }`}
      style={depth ? { paddingInlineStart: `${depth * 1.25}rem` } : undefined}
    >
      <span>{nodeName(node, language)}</span>
      <span className={`shrink-0 tabular-nums ${top ? "text-foreground" : "text-muted-foreground"}`}>
        {formatArchiveCount(nodeCount(node, catalogue) ?? 0, language)}
      </span>
    </Link>
  );
}

/**
 * "Where the evidence comes from", as the archive folder tree on /materials,
 * read from the same `/api/document-sources/` catalogue: the totals, then the
 * full coverage table, every folder, office and series with its count,
 * expanded so the whole coverage is visible at once. Each row links into it.
 */
export function SourcesSummary() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data } = useQuery({ ...documentSourcesQuery(), staleTime: 5 * 60 * 1000 });
  const total = archiveTotal(data);
  if (total === null) return null;
  const folders = withUnfiled(data, language);
  const rows = flatten(folders);
  const { at, continues } = splitColumns(rows);
  const list = (part: readonly CoverageRow[]) => (
    <ul className="list-none divide-y divide-border">
      {part.map((row) => (
        <li key={row.path.join("/")} data-depth={row.depth}>
          <CoverageRowLink row={row} catalogue={data} language={language} />
        </li>
      ))}
    </ul>
  );

  return (
    <section className="border-t border-border pt-10" aria-labelledby="sources-summary-heading">
      <h2
        id="sources-summary-heading"
        className="font-case-section-title"
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
      {/* One column on small screens; two balanced columns from lg up. The
          continued-folder line only shows when the columns sit side by side. */}
      <div className="mt-6 grid max-w-2xl grid-cols-1 lg:max-w-none lg:grid-cols-2 lg:gap-x-12">
        <div className="border-t border-border lg:border-b">{list(rows.slice(0, at))}</div>
        {at < rows.length && (
          <div className="border-y border-border">
            {continues && (
              <p
                aria-hidden="true"
                className={`${ROW} hidden border-b border-border font-semibold text-foreground lg:flex`}
              >
                <span>
                  {nodeName(continues.node, language)}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t("dataQuality.materialsBySource.continued")}
                  </span>
                </span>
              </p>
            )}
            {list(rows.slice(at))}
          </div>
        )}
      </div>
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
