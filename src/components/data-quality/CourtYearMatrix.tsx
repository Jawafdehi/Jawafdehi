import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DataLakeMetrics } from "@/types/jds";
import { useIsNarrow } from "@/hooks/useIsNarrow";
import { bsYearRows, bsYearWithAd } from "@/lib/data-quality";

/** Court levels in institutional order; anything else sorts after. */
const COURT_ORDER = ["district", "high", "supreme", "special"];

/**
 * Year columns kept on phones before the "show all years" opt-in. The full range
 * runs 25 columns at ~48px — a 1368px grid in a ~380px scroller, so reaching the
 * years anyone actually asks about means dragging past two decades of sparse
 * cells. Six recent years cut that to ~456px: a nudge of scroll rather than a
 * journey, still enough columns to read a trend, and the rest are one tap away.
 */
const NARROW_YEAR_LIMIT = 6;

/** Compact count for dense cells: 140000 -> "140k", 1500000 -> "1.5M". */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Court x year heatmap: court levels as rows, Bikram Sambat registration years
 * as columns, cell shading = case volume on a sequential single-hue (accent)
 * scale. A right-hand column carries each level's total (the standalone per-level
 * bars are removed, so the level distribution lives here). Two filters subset
 * rows (court level) and columns (year). The grid scrolls horizontally rather
 * than crushing on mobile.
 *
 * Column headers are bare BS years — the section heading names the calendar, and
 * a marker repeated across 25 columns is noise — with the full "BS 2081 (AD
 * 2024/25)" form in each cell's tooltip.
 *
 * Reads ngm.by_court_type_year; renders nothing until that field is present.
 */
export function CourtYearMatrix({ ngm }: { ngm?: DataLakeMetrics }) {
  const { t } = useTranslation();
  const [levelFilter, setLevelFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [showAllYears, setShowAllYears] = useState(false);
  const narrow = useIsNarrow();

  const rows = bsYearRows(ngm?.by_court_type_year);

  const { cells, years, courtTypes, maxCount } = useMemo(() => {
    const cellMap = new Map<string, number>();
    const yearSet = new Set<number>();
    const typeSet = new Set<string>();
    for (const r of rows) {
      const type = (r.court__court_type || "other").toLowerCase();
      const key = `${type}|${r.bs_year}`;
      cellMap.set(key, (cellMap.get(key) ?? 0) + r.count);
      yearSet.add(r.bs_year);
      typeSet.add(type);
    }
    const years = [...yearSet].sort((a, b) => a - b);
    const courtTypes = [
      ...COURT_ORDER.filter((c) => typeSet.has(c)),
      ...[...typeSet].filter((c) => !COURT_ORDER.includes(c)).sort(),
    ];
    let maxCount = 0;
    for (const v of cellMap.values()) maxCount = Math.max(maxCount, v);
    return { cells: cellMap, years, courtTypes, maxCount };
  }, [rows]);

  if (!rows.length) return null;

  const visibleTypes =
    levelFilter === "all" ? courtTypes : courtTypes.filter((c) => c === levelFilter);
  // Two distinct year lists. `filteredYears` is what the reader asked for via the
  // year <select>; `visibleYears` is what we actually paint as columns, trimmed to
  // the most recent few on phones unless they opt into the full range.
  const filteredYears =
    yearFilter === "all" ? years : years.filter((y) => String(y) === yearFilter);
  const yearsTrimmed = narrow && !showAllYears && filteredYears.length > NARROW_YEAR_LIMIT;
  const visibleYears = yearsTrimmed
    ? filteredYears.slice(-NARROW_YEAR_LIMIT)
    : filteredYears;

  const cellFor = (type: string, year: number) => cells.get(`${type}|${year}`) ?? 0;
  // Totals deliberately span `filteredYears`, not `visibleYears`: the trim is a
  // viewport accommodation, not a filter, so a phone and a desktop must report the
  // same number for the same selection. The caption below says so explicitly.
  const rowTotal = (type: string) =>
    filteredYears.reduce((sum, y) => sum + cellFor(type, y), 0);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("dataQuality.courtCases.filterCourt", "Court level")}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="all">{t("dataQuality.courtCases.filterAll", "All")}</option>
            {courtTypes.map((c) => (
              <option key={c} value={c}>
                {t(`dataQuality.backbone.courtType.${c}`, c)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("dataQuality.courtCases.filterYear", "Year")}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value="all">{t("dataQuality.courtCases.filterAll", "All")}</option>
            {/* The dropdown has room the column headers don't, and it is where a
                reader deliberately picks a year — so spell the calendar out. */}
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {bsYearWithAd(y, t)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Grid — scrolls horizontally on narrow screens.
          `contain:paint` is load-bearing on phones: without it Chrome counts the
          wide table towards the document's content width even though the scroller
          clips it, expands the mobile layout viewport to fit, and shrink-to-fits
          the whole page (everything renders zoomed out). Paint containment tells
          the engine the clip is guaranteed, so the viewport stays device-width. */}
      <div className="overflow-x-auto [contain:paint]">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-background px-2 py-1 text-left text-xs font-semibold text-muted-foreground" />
              {visibleYears.map((y) => (
                <th
                  key={y}
                  className="px-2 py-1 text-center font-mono text-xs font-semibold tabular-nums text-muted-foreground"
                >
                  {y}
                </th>
              ))}
              <th className="px-2 py-1 text-right text-xs font-semibold text-muted-foreground">
                {t("dataQuality.courtCases.total", "Total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleTypes.map((type) => (
              <tr key={type}>
                <th className="sticky left-0 whitespace-nowrap bg-background px-2 py-1 text-left text-sm font-medium text-foreground">
                  {t(`dataQuality.backbone.courtType.${type}`, type)}
                </th>
                {visibleYears.map((year) => {
                  const count = cellFor(type, year);
                  const op = count > 0 && maxCount > 0 ? Math.max(count / maxCount, 0.06) : 0;
                  const dense = op >= 0.55;
                  return (
                    <td
                      key={year}
                      title={`${t(`dataQuality.backbone.courtType.${type}`, type)} · ${bsYearWithAd(year, t)}: ${count.toLocaleString()}`}
                      className="rounded px-2 py-2 text-center font-mono text-[11px] tabular-nums"
                      style={{
                        backgroundColor:
                          count > 0
                            ? `hsl(var(--accent) / ${op.toFixed(3)})`
                            : "hsl(var(--muted) / 0.3)",
                        color: dense
                          ? "hsl(var(--accent-foreground))"
                          : "hsl(var(--foreground))",
                      }}
                    >
                      <span aria-hidden="true">
                        {count > 0 ? formatCompact(count) : "·"}
                      </span>
                      <span className="sr-only">{count.toLocaleString()}</span>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                  {rowTotal(type).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Year-trim notice + opt-in. Only rendered on phones with a trimmed range,
          so desktop is untouched. The count of hidden years is spelled out rather
          than left implicit — a heatmap that quietly drops columns misreads as a
          complete record. */}
      {narrow && (yearsTrimmed || showAllYears) && filteredYears.length > NARROW_YEAR_LIMIT && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {yearsTrimmed && (
            <span>
              {t(
                "dataQuality.courtCases.yearsTrimmed",
                "Showing the last {{shown}} years. Totals cover all {{all}}.",
                { shown: visibleYears.length, all: filteredYears.length },
              )}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowAllYears((v) => !v)}
            className="rounded-md px-1 font-medium text-foreground underline underline-offset-2 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {showAllYears
              ? t("dataQuality.courtCases.showRecentYears", "Show recent years only")
              : t("dataQuality.courtCases.showAllYears", "Show all years")}
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t("dataQuality.courtCases.legendLabel", "Case volume")}</span>
        <span>{t("dataQuality.courtCases.legendLow", "fewer")}</span>
        <span
          className="h-2.5 w-24 rounded-full"
          style={{
            background:
              "linear-gradient(to right, hsl(var(--accent) / 0.08), hsl(var(--accent)))",
          }}
          aria-hidden="true"
        />
        <span>{t("dataQuality.courtCases.legendHigh", "more")}</span>
      </div>
    </div>
  );
}
