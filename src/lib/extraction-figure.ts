/**
 * Shaping an extracted chart's points into something plottable.
 *
 * The hard part is that the upstream dataset is NOT consistent about which of
 * `label` / `series` holds the category axis. Both conventions appear, in the
 * same corpus, for the same kind of chart:
 *
 *   ciaa-2080-81 p378   label = '२०४७/४८' …   series = 'उजुरी' | 'फछ्यौंट'
 *   ciaa-2081-82 p291   label = 'उजुरी सङ्ख्या' …  series = '२०४७/४८' …
 *
 * Trusting the field names renders the second one with its 35 fiscal years
 * demoted to a secondary column and the same measure name repeated down the
 * page. So the axis is detected from the data's shape instead: the field with
 * more distinct values is the category axis, and the other names the series.
 */

import type { ExtractionPoint } from "@/services/datalake-api";

export interface PlottedSeries {
  name: string;
  points: { category: string; value: number | null; estimated: boolean }[];
}

export interface PlottedFigure {
  /** Ordered category axis — fiscal years, districts, offence types. */
  categories: string[];
  series: PlottedSeries[];
  /** True when any point was read off the chart image rather than printed. */
  hasEstimates: boolean;
  /** Which field the categories came from; drives the table's column order. */
  categoryField: "label" | "series";
}

const distinct = (values: string[]) => new Set(values.filter(Boolean)).size;

/**
 * Decide which field is the category axis.
 *
 * Ties go to `label`, which is the dataset's more common convention — and when
 * both have one distinct value the choice cannot matter.
 */
export function categoryField(points: ExtractionPoint[]): "label" | "series" {
  return distinct(points.map((p) => p.series)) >
    distinct(points.map((p) => p.label))
    ? "series"
    : "label";
}

export function plotFigure(points: ExtractionPoint[]): PlottedFigure {
  const field = categoryField(points);
  const other = field === "label" ? "series" : "label";

  // Insertion order, which is `point_index` order — the order the figure was
  // read in, and the only ordering that is meaningful for a time axis. Sorting
  // alphabetically would scramble Devanagari fiscal years.
  const categories: string[] = [];
  const byName = new Map<string, PlottedSeries>();

  for (const point of points) {
    const category = point[field] || "—";
    if (!categories.includes(category)) categories.push(category);
    const name = point[other] || "";
    let series = byName.get(name);
    if (!series) {
      series = { name, points: [] };
      byName.set(name, series);
    }
    series.points.push({
      category,
      value: point.value,
      estimated: point.estimated,
    });
  }

  return {
    categories,
    series: [...byName.values()],
    hasEstimates: points.some((p) => p.estimated),
    categoryField: field,
  };
}

/**
 * Map the upstream's chart vocabulary onto something we can draw.
 *
 * It is wider and less tidy than an enum: `pie` and `pie_3d` and `stacked bar`
 * and `stacked_bar` all occur. Anything we cannot draw honestly — venn, radar,
 * bubble — returns null and the panel shows the numbers alone rather than
 * approximating the source with a shape it never had.
 */
export function chartKind(chartType: string): "line" | "bar" | "pie" | null {
  const token = chartType.toLowerCase().replace(/[\s_-]+/g, "");
  if (!token) return null;
  if (token.startsWith("pie") || token.startsWith("donut")) return "pie";
  if (token.startsWith("line")) return "line";
  if (token.includes("bar") || token.startsWith("column")) return "bar";
  return null;
}

/**
 * How many categorical hues we have. The brand defines exactly five chart
 * colours (`--chart-1`…`--chart-5`), and a sixth slice must NOT reuse the first:
 * two identically-coloured slices in one ring make the legend ambiguous.
 */
export const MAX_HUES = 5;

/**
 * A pie is only honest for ONE series of non-negative parts that fits the
 * palette.
 *
 * The slice cap is not fussiness. Every slice in a ring is visually adjacent to
 * every other, so a pie is the all-pairs colour case, which is the hardest one —
 * past a handful of hues no ordering keeps them separable, for colour-blind
 * readers least of all. 95 of this corpus's 155 single-series pies have more
 * than five slices (up to sixteen), so those are drawn as horizontal bars
 * instead: the category sits beside its bar and carries no colour load at all.
 *
 * That is a re-encoding, not an approximation — identical numbers, a legible
 * shape. It is categorically different from redrawing a venn or a radar, where
 * the relationships encoded cannot survive the change.
 */
export function pieIsSafe(figure: PlottedFigure): boolean {
  return (
    figure.series.length === 1 &&
    figure.series[0].points.length <= MAX_HUES &&
    figure.series[0].points.every((p) => p.value !== null && p.value >= 0)
  );
}

/**
 * Beyond the palette there is no honest way to tell series apart, and a chart
 * with this many lines is unreadable regardless. Six of the corpus's 477
 * figures hit this; they show their numbers instead.
 */
export function tooManySeries(figure: PlottedFigure): boolean {
  return figure.series.length > MAX_HUES;
}
