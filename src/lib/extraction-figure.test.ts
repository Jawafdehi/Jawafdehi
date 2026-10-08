import { describe, it, expect } from "vitest";

import {
  categoryField,
  chartKind,
  pieIsSafe,
  plotFigure,
  tooManySeries,
} from "@/lib/extraction-figure";
import type { ExtractionPoint } from "@/services/datalake-api";

const pt = (
  i: number,
  label: string,
  series: string,
  value: number | null,
  estimated = false,
): ExtractionPoint => ({
  point_index: i,
  label,
  series,
  value,
  estimated,
});

describe("categoryField — which field is the category axis", () => {
  it("picks label when it is the varying one (the common convention)", () => {
    // ciaa-2080-81 p378: years in label, measures in series.
    const points = [
      pt(1, "२०४७/४८", "उजुरी", 564),
      pt(2, "२०४८/४९", "उजुरी", 1069),
      pt(3, "२०४७/४८", "फछ्यौंट", 300),
    ];
    expect(categoryField(points)).toBe("label");
  });

  it("picks series when the dataset inverts them", () => {
    // ciaa-2081-82 p291: measures in label, 35 fiscal years in series. Trusting
    // the field names here repeats one measure name down the page and demotes
    // the years to a secondary column.
    const points = [
      pt(1, "उजुरी सङ्ख्या", "२०४७/४८", 1),
      pt(2, "उजुरी सङ्ख्या", "२०४८/४९", 150),
      pt(3, "उजुरी सङ्ख्या", "२०४९/५०", 200),
      pt(4, "फछ्यौट सङ्ख्या", "२०४७/४८", 1),
      pt(5, "फछ्यौट सङ्ख्या", "२०४८/४९", 90),
      pt(6, "फछ्यौट सङ्ख्या", "२०४९/५०", 120),
    ];
    expect(categoryField(points)).toBe("series");
  });

  it("falls back to label when series is empty throughout", () => {
    const points = [pt(1, "क", "", 1), pt(2, "ख", "", 2)];
    expect(categoryField(points)).toBe("label");
  });

  it("breaks a tie towards label", () => {
    const points = [pt(1, "a", "x", 1), pt(2, "b", "y", 2)];
    expect(categoryField(points)).toBe("label");
  });
});

describe("plotFigure", () => {
  it("groups the inverted shape into one series per measure", () => {
    const points = [
      pt(1, "उजुरी सङ्ख्या", "२०४७/४८", 1, true),
      pt(2, "फछ्यौट सङ्ख्या", "२०४७/४८", 1, true),
      pt(3, "उजुरी सङ्ख्या", "२०४८/४९", 150),
      pt(4, "फछ्यौट सङ्ख्या", "२०४८/४९", 90),
      pt(5, "उजुरी सङ्ख्या", "२०४९/५०", 200),
      pt(6, "फछ्यौट सङ्ख्या", "२०४९/५०", 120),
    ];
    const plotted = plotFigure(points);
    expect(plotted.categoryField).toBe("series");
    expect(plotted.categories).toEqual(["२०४७/४८", "२०४८/४९", "२०४९/५०"]);
    expect(plotted.series.map((s) => s.name)).toEqual([
      "उजुरी सङ्ख्या",
      "फछ्यौट सङ्ख्या",
    ]);
    expect(plotted.hasEstimates).toBe(true);
  });

  it("keeps categories in point order, not alphabetical", () => {
    // Devanagari fiscal years do not sort into chronological order, and a time
    // axis that is not in time order is worse than no chart.
    const points = [
      pt(1, "२०७९/८०", "x", 3),
      pt(2, "२०४७/४८", "x", 1),
      pt(3, "२०६०/६१", "x", 2),
    ];
    expect(plotFigure(points).categories).toEqual([
      "२०७९/८०",
      "२०४७/४८",
      "२०६०/६१",
    ]);
  });

  it("names an unnamed single series with the empty string", () => {
    const plotted = plotFigure([pt(1, "क", "", 1), pt(2, "ख", "", 2)]);
    expect(plotted.series).toHaveLength(1);
    expect(plotted.series[0].points).toHaveLength(2);
  });

  it("reports no estimates when every value was printed", () => {
    expect(plotFigure([pt(1, "क", "", 1)]).hasEstimates).toBe(false);
  });
});

describe("chartKind", () => {
  it.each([
    ["pie", "pie"],
    ["pie_3d", "pie"],
    ["donut", "pie"],
    ["line", "line"],
    ["bar", "bar"],
    ["column", "bar"],
    ["stacked_bar", "bar"],
    ["stacked bar", "bar"],
    ["bar_grouped_3d", "bar"],
    ["clustered_bar", "bar"],
    ["stacked_bar_horizontal", "bar"],
  ])("maps %s to %s", (input, expected) => {
    expect(chartKind(input)).toBe(expected);
  });

  it.each(["venn", "venn diagram", "radar", "bubble", "other", ""])(
    "refuses to draw %s",
    (input) => {
      // Approximating these with a shape the source never had would misrepresent
      // the document. The panel shows the numbers instead.
      expect(chartKind(input)).toBeNull();
    },
  );
});

describe("pieIsSafe", () => {
  it("accepts one series of non-negative parts", () => {
    expect(pieIsSafe(plotFigure([pt(1, "क", "", 60), pt(2, "ख", "", 40)]))).toBe(
      true,
    );
  });

  it("rejects a multi-series figure typed pie in the source", () => {
    // Two measures over shared categories is several pies, not one.
    const points = [
      pt(1, "क", "A", 1),
      pt(2, "क", "B", 2),
      pt(3, "ख", "A", 3),
      pt(4, "ख", "B", 4),
    ];
    expect(pieIsSafe(plotFigure(points))).toBe(false);
  });

  it("accepts a single measure spread across categories", () => {
    // label constant, categories in series — still one ring of slices.
    const points = [pt(1, "क", "A", 1), pt(2, "क", "B", 2), pt(3, "क", "C", 3)];
    expect(pieIsSafe(plotFigure(points))).toBe(true);
  });

  it("rejects a negative slice", () => {
    expect(pieIsSafe(plotFigure([pt(1, "क", "", -1)]))).toBe(false);
  });

  it("rejects a missing value", () => {
    expect(pieIsSafe(plotFigure([pt(1, "क", "", null)]))).toBe(false);
  });
});

describe("palette bounds", () => {
  const ring = (n: number) =>
    plotFigure(
      Array.from({ length: n }, (_, i) => pt(i + 1, `slice${i}`, "", i + 1)),
    );

  it("accepts a pie that fits the five brand hues", () => {
    expect(pieIsSafe(ring(5))).toBe(true);
  });

  it("rejects a six-slice pie rather than reusing a hue", () => {
    // Every slice in a ring is adjacent to every other, so a repeated colour is
    // ambiguous outright. These are drawn as horizontal bars instead.
    expect(pieIsSafe(ring(6))).toBe(false);
    expect(pieIsSafe(ring(16))).toBe(false);
  });

  /** n series over n+1 categories, so the category axis is unambiguous. */
  const grid = (seriesCount: number) => {
    const categories = seriesCount + 1;
    const points = [];
    let i = 1;
    for (let c = 0; c < categories; c++)
      for (let s = 0; s < seriesCount; s++)
        points.push(pt(i++, `cat${c}`, `series${s}`, i));
    return plotFigure(points);
  };

  it("flags a figure with more series than hues", () => {
    const figure = grid(6);
    expect(figure.series).toHaveLength(6);
    expect(tooManySeries(figure)).toBe(true);
  });

  it("allows up to five series", () => {
    const figure = grid(5);
    expect(figure.series).toHaveLength(5);
    expect(tooManySeries(figure)).toBe(false);
  });
});
