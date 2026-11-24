// The /data-quality coverage table: the archive folder tree as flat rows, and
// where to break those rows into two columns.
import type { ArchiveNode } from "@/data/archive-folders";

/** One row per node, depth-first, so the whole tree reads as one table. */
export interface CoverageRow {
  node: ArchiveNode;
  path: string[];
  depth: number;
}

export function flatten(nodes: readonly ArchiveNode[], above: string[] = [], depth = 0): CoverageRow[] {
  return nodes.flatMap((node) => {
    const path = [...above, node.slug];
    const row = { node, path, depth };
    return node.type === "branch" ? [row, ...flatten(node.children, path, depth + 1)] : [row];
  });
}

/**
 * Split the rows into two columns of near-equal length, breaking only between
 * offices so an office never parts from its series, and a folder heading
 * always stays with its first office. Returns the right column's first index
 * and, when that break lands inside a folder, the folder row it continues.
 */
export function splitColumns(rows: readonly CoverageRow[]): {
  at: number;
  continues: CoverageRow | null;
} {
  // A break may fall before any office or folder, except the office directly
  // under its folder heading.
  const breaks = rows.flatMap((row, index) =>
    index > 0 && row.depth <= 1 && rows[index - 1].depth !== 0 ? [index] : [],
  );
  if (!breaks.length) return { at: rows.length, continues: null };
  const at = breaks.reduce((best, index) =>
    Math.abs(rows.length - 2 * index) < Math.abs(rows.length - 2 * best) ? index : best,
  );
  let continues: CoverageRow | null = null;
  if (rows[at].depth !== 0) {
    for (let index = at - 1; index >= 0 && !continues; index--) {
      if (rows[index].depth === 0) continues = rows[index];
    }
  }
  return { at, continues };
}
