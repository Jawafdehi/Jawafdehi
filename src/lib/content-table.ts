/**
 * Shaping an OCR'd pipe-table so it can be read.
 *
 * These tables are recovered from scans, and the recovery leaves artefacts that
 * are not in the printed document: columns that exist in the grid but hold
 * nothing at all, and a uniform minimum column width that makes a 14-column
 * table 1,568px wide before a single character is measured.
 *
 * Everything here is LOSSLESS with respect to cell contents. Nothing that the
 * document printed is dropped — see `dropEmptyColumns`, which is deliberately
 * conservative about what "empty" means.
 */

/** A column narrower than this many characters needs no 7rem of runway. */
const NARROW_CHARS = 4;
/** Above this, a column is prose and wants room to wrap rather than a cap. */
const WIDE_CHARS = 28;

export type ColumnWidth = "narrow" | "normal" | "wide";

/**
 * Drop columns that are empty in EVERY row, header included.
 *
 * In the 35th CIAA report, 4 of table p0052-t1's 14 columns hold nothing
 * anywhere — across a 24-table sample, a third of tables carry at least one and
 * 16% of all column width is empty. They come from the extractor resolving a
 * ruled grid more finely than the printed table used, and they cost the full
 * minimum column width each while showing the reader nothing.
 *
 * **Lossless by construction.** A column survives if ANY row has a non-blank
 * cell in it, so no character the document printed can be removed. That is a
 * stronger test than "the header is blank" — these tables routinely have blank
 * headers over real data, because a merged header cell arrives as an empty
 * string in every column it spanned but the first.
 *
 * Ragged rows are handled by position: a row shorter than the widest gets empty
 * strings for the columns it lacks, which is what it already meant.
 */
export function dropEmptyColumns(rows: string[][]): string[][] {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (width === 0) return rows;

  const keep: number[] = [];
  for (let c = 0; c < width; c += 1) {
    if (rows.some((row) => (row[c] ?? "").trim() !== "")) keep.push(c);
  }

  // Every column empty means we have no idea what this is; hand it back
  // untouched rather than returning a table of zero columns.
  if (keep.length === 0 || keep.length === width) return rows;

  return rows.map((row) => keep.map((c) => row[c] ?? ""));
}

/**
 * How much runway each column needs, from what it actually holds.
 *
 * A fixed `min-w` per column is what makes these tables scroll so far: a serial
 * number column holding "1".."9" was reserving the same 7rem as a column of
 * Devanagari prose. Measuring the longest cell lets the narrow ones collapse
 * and gives the width back to the columns that have something to say.
 *
 * Measured on the longest cell rather than the mean: one long cell in an
 * otherwise short column still has to fit, and a column sized to its average
 * wraps that cell to five lines.
 */
export function columnWidths(rows: string[][]): ColumnWidth[] {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return Array.from({ length: width }, (_, c) => {
    const longest = rows.reduce(
      (max, row) => Math.max(max, (row[c] ?? "").trim().length),
      0,
    );
    if (longest <= NARROW_CHARS) return "narrow";
    if (longest <= WIDE_CHARS) return "normal";
    return "wide";
  });
}
