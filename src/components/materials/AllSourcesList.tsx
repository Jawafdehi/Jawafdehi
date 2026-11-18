import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  documentSourcesQuery,
  pickLabel,
  publisherGroups,
  sourceBrowseHref,
} from "@/lib/document-sources";
import { materialTypeKeyFor } from "@/lib/material-type-labels";
import { formatArchiveCount } from "@/lib/materials-landing";

/**
 * Every source the archive holds, grouped by the office that publishes it,
 * with each source's document kinds and live count, all from
 * `/api/document-sources/`. This is the site's ONE list of sources:
 * /data-quality summarises it and links here. A source added in the admin
 * appears under its office with no release.
 */
export function AllSourcesList() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data } = useQuery({
    ...documentSourcesQuery(),
    staleTime: 5 * 60 * 1000,
  });
  const groups = publisherGroups(data, language);

  // Nothing until the list arrives (the pre-rendered page already carries it),
  // and nothing at all if the request fails: no empty heading.
  if (groups.length === 0) return null;

  return (
    <div>
      <h2 id="sources-heading" className="font-archive-section-title">
        {t("materialsLanding.sources.title")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        {t("materialsLanding.sources.lede")}
      </p>
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <section key={group.key} data-publisher={group.key} aria-label={group.label}>
            <h3 className="flex items-baseline justify-between gap-4 border-b border-border pb-2 font-semibold text-foreground">
              <span>{group.label}</span>
              <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
                {formatArchiveCount(group.count, language)}
              </span>
            </h3>
            <ul className="mt-2 list-none">
              {group.sources.map((row) => {
                const kinds = [
                  ...new Set(
                    (row.types ?? []).map((entry) =>
                      t(`dataQuality.materialsByType.type.${materialTypeKeyFor(entry.type)}`),
                    ),
                  ),
                ].join(" · ");
                return (
                  <li key={row.source}>
                    <Link
                      to={sourceBrowseHref(row.source)}
                      data-source={row.source}
                      className="group flex items-center justify-between gap-4 rounded-md px-2 py-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground group-hover:text-primary">
                          {pickLabel(row.name, language)}
                        </span>
                        {kinds && (
                          <span className="block truncate text-xs text-muted-foreground">{kinds}</span>
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
          </section>
        ))}
      </div>
    </div>
  );
}
