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
 * A pie is honest for ONE series of non-negative parts. Nothing else about the
 * figure disqualifies it: if the report drew a pie, we draw a pie.
 *
 * Slice COUNT deliberately does not. A ring is the hardest colour case there
 * is — every slice is adjacent to every other — and this corpus has pies with
 * up to sixteen slices, well past any palette. The answer is to stop making
 * colour carry identity: every slice is labelled directly, so the hue is
 * decoration and a repeat is survivable.
 */
export function pieIsSafe(figure: PlottedFigure): boolean {
  return (
    figure.series.length === 1 &&
    figure.series[0].points.every((p) => p.value !== null && p.value >= 0)
  );
}

/**
 * How many categorical hues the brand defines (`--chart-1`…`--chart-5`).
 *
 * It bounds SERIES, not pie slices. A line or a grouped bar identifies its
 * series by colour alone — there is nowhere to put a direct label — so past
 * five the palette would have to repeat and two series would be
 * indistinguishable. A pie has no such limit because every slice is labelled.
 */
export const MAX_HUES = 5;

/**
 * Beyond the palette there is no honest way to tell series apart, and a chart
 * with this many lines is unreadable regardless. Six of the corpus's 477
 * figures hit this; they show their numbers instead.
 */
export function tooManySeries(figure: PlottedFigure): boolean {
  return figure.series.length > MAX_HUES;
}
