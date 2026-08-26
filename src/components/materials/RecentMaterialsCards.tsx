import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { seriesBySource } from "@/data/material-series";
import { sourceKeyFor } from "@/lib/material-source-labels";
import {
  folderTintClass,
  formatLedgerDate,
  pickLocalized,
  sourceFromMaterialUrl,
} from "@/lib/materials-landing";

import type { RecentMaterial } from "@/lib/materials-landing";

/**
 * The "recently added" register as a grid of raised document cards. Every
 * figure is real API data; documents without a resolvable date never reach
 * this component (lib/materials-landing drops them).
 */
export function RecentMaterialsCards({
  materials,
}: Readonly<{ materials: readonly RecentMaterial[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  return (
    <ul className="grid list-none grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {materials.map(({ result, date }) => {
        const source = sourceFromMaterialUrl(result.url);
        const series = source ? seriesBySource(source) : undefined;
        const seriesLabel = series
          ? pickLocalized(series.name, language)
          : t(
              `dataQuality.materialsBySource.source.${sourceKeyFor(source ?? "")}`,
              source ?? "—",
            );
        const title =
          pickLocalized(result.title, language) ||
          t("materialsLanding.recent.untitled", "Untitled document");
        return (
          <li key={result.id}>
            <Link
              to={result.url}
              className={[
                "flex h-full flex-col justify-between gap-5 rounded-xl border border-border bg-surface p-5 shadow-elev-sm",
                "transition-[transform,box-shadow] duration-200 ease-out-strong",
                "hover:-translate-y-0.5 hover:shadow-elev-md active:scale-[0.99]",
                "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              ].join(" ")}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border border-primary/20 ${
                      series ? folderTintClass(series.tint) : "bg-muted"
                    }`}
                  />
                  <span className="truncate">{seriesLabel}</span>
                </p>
                <h3 className="mt-3 line-clamp-3 font-medium leading-snug text-foreground">
                  {title}
                </h3>
              </div>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {formatLedgerDate(date, language)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
