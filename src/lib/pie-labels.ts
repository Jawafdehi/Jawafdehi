/**
 * Pie-label geometry. Lives outside the chart component so it can be unit
 * tested directly, and so that module exports only its component — exporting
 * helpers alongside a component breaks fast refresh (react-refresh lint).
 */

/** Pie label type size, and the vertical room one needs. */
export const LABEL_SIZE = 13;
export const LABEL_GAP = 19;

export const RADIAN = Math.PI / 180;

export interface PieLabelSpec {
  midAngle: number;
  side: "left" | "right";
  y: number;
}

export function layoutPieLabels(
  values: number[],
  cy: number,
  radius: number,
): PieLabelSpec[] {
  const total = values.reduce((sum, v) => sum + v, 0) || 1;
  let acc = 0;
  const specs = values.map((value) => {
    const mid = 90 - ((acc + value / 2) / total) * 360;
    acc += value;
    return {
      midAngle: mid,
      side: (Math.cos(-mid * RADIAN) >= 0 ? "right" : "left") as "left" | "right",
      y: cy + radius * Math.sin(-mid * RADIAN),
    };
  });

  // Each side is de-collided independently; a label only ever collides with the
  // ones sharing its side of the ring.
  for (const side of ["left", "right"] as const) {
    const column = specs
      .filter((spec) => spec.side === side)
      .sort((a, b) => a.y - b.y);
    if (!column.length) continue;

    for (let k = 1; k < column.length; k++) {
      const gap = column[k].y - column[k - 1].y;
      if (gap < LABEL_GAP) column[k].y = column[k - 1].y + LABEL_GAP;
    }

    // Pushing only ever moves labels DOWN, so a crowded side drifts off the
    // bottom. Re-centre the whole column on the ring instead of clamping it to
    // the ring's own height: a side carrying fifteen of sixteen labels needs
    // far more vertical room than the ring is tall, and the canvas is sized for
    // exactly that (see `sidedLabelRows`).
    const top = column[0].y;
    const bottom = column[column.length - 1].y;
    const shift = cy - (top + bottom) / 2;
    for (const spec of column) spec.y += shift;
  }
  return specs;
}

/**
 * How many labels the busier side of the ring carries.
 *
 * The canvas has to be sized from this, not from half the slice count: one
 * dominant slice pushes every other label onto the opposite side. The 16-slice
 * pie on p276 of the 30th report puts 15 labels on the left, and sizing for 8
 * clipped the column top and bottom.
 */
export function sidedLabelRows(values: number[]): number {
  const specs = layoutPieLabels(values, 0, 1);
  const right = specs.filter((s) => s.side === "right").length;
  return Math.max(right, specs.length - right);
}
