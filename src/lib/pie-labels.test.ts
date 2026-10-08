import { describe, it, expect } from "vitest";

import { layoutPieLabels, sidedLabelRows } from "@/lib/pie-labels";

/** The minimum vertical gap the layout enforces; mirrors LABEL_GAP. */
const GAP = 19;

const gaps = (ys: number[]) =>
  ys
    .slice()
    .sort((a, b) => a - b)
    .slice(1)
    .map((y, i) => y - ys.slice().sort((a, b) => a - b)[i]);

describe("layoutPieLabels", () => {
  it("separates every pair on a side by at least the gap", () => {
    // Sixteen near-equal slices is the corpus's worst pie; recharts' own
    // placement overlaps badly here.
    const specs = layoutPieLabels(Array(16).fill(1), 200, 110);
    for (const side of ["left", "right"] as const) {
      const ys = specs.filter((s) => s.side === side).map((s) => s.y);
      for (const g of gaps(ys)) expect(g).toBeGreaterThanOrEqual(GAP - 0.001);
    }
  });

  it("keeps many tiny adjacent slices apart", () => {
    // The real failure: one huge slice and a crowd of 1% ones sharing an arc.
    const specs = layoutPieLabels([60, ...Array(12).fill(1)], 200, 110);
    for (const side of ["left", "right"] as const) {
      const ys = specs.filter((s) => s.side === side).map((s) => s.y);
      for (const g of gaps(ys)) expect(g).toBeGreaterThanOrEqual(GAP - 0.001);
    }
  });

  it("leaves a comfortable pie untouched", () => {
    const specs = layoutPieLabels([25, 25, 25, 25], 200, 110);
    const ys = specs.map((s) => s.y);
    // Four slices at 90° apart are already far enough apart to need no nudging.
    expect(Math.min(...ys)).toBeGreaterThan(200 - 110 - GAP);
    expect(Math.max(...ys)).toBeLessThan(200 + 110 + GAP);
  });

  it("splits labels onto the side their slice is on", () => {
    const specs = layoutPieLabels([50, 50], 200, 110);
    expect(new Set(specs.map((s) => s.side))).toEqual(new Set(["left", "right"]));
  });

  it("does not let a crowded side run off the bottom", () => {
    const specs = layoutPieLabels(Array(20).fill(1), 200, 110);
    for (const side of ["left", "right"] as const) {
      const ys = specs.filter((s) => s.side === side).map((s) => s.y);
      // Pushing only ever moves labels down, so without the lift-back the last
      // one ends up far below the ring.
      expect(Math.max(...ys)).toBeLessThanOrEqual(200 + 110 + GAP + 0.001);
    }
  });

  it("handles a single slice", () => {
    expect(layoutPieLabels([1], 200, 110)).toHaveLength(1);
  });

  it("survives an all-zero figure without dividing by zero", () => {
    const specs = layoutPieLabels([0, 0], 200, 110);
    expect(specs.every((s) => Number.isFinite(s.y))).toBe(true);
  });
});

describe("sidedLabelRows", () => {
  it("counts the busier side, not half the slices", () => {
    // p276 of the 30th report: one 52% slice owns the whole right-hand arc, so
    // fifteen of sixteen labels land on the left. Sizing the canvas for eight
    // clipped that column at both ends.
    const values = [39, 9, 5, 4, 4, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1];
    expect(sidedLabelRows(values)).toBeGreaterThan(Math.ceil(values.length / 2));
  });

  it("is about half for an even ring", () => {
    expect(sidedLabelRows([25, 25, 25, 25])).toBe(2);
  });

  it("centres a crowded column on the ring rather than letting it drift down", () => {
    const values = [39, ...Array(15).fill(1)];
    const specs = layoutPieLabels(values, 300, 110);
    const left = specs.filter((s) => s.side === "left").map((s) => s.y);
    const mid = (Math.min(...left) + Math.max(...left)) / 2;
    expect(Math.abs(mid - 300)).toBeLessThan(0.001);
  });
});
