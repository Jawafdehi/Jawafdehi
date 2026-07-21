import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface MaterialsTypeRow {
  /** Stable key for React. */
  key: string;
  /** Document-type label, e.g. "Press releases". Empty when no cross-tab. */
  type: string;
  count: number;
}

export interface MaterialsSourceGroup {
  /** Stable key for React. */
  key: string;
  /** Publishing institution, e.g. "Nepal Courts". */
  source: string;
  /** One row per document type this institution contributes. */
  rows: MaterialsTypeRow[];
}

/**
 * One institution-centric evidence table: Source | Document type | Documents |
 * Share. Each institution's document types are separate rows with their own
 * counts (CIAA → a press-releases row and an annual-reports row), tucked under a
 * single source cell that row-spans the block. Institutions are ordered by total
 * volume, types within them by count. Share is each type's slice of the whole
 * dataset (a single denominator, so the column sums to ~100%).
 */
export function MaterialsTable({ groups }: { groups: MaterialsSourceGroup[] }) {
  const { t, i18n } = useTranslation();
  const nonEmpty = groups.filter((g) => g.rows.length > 0);
  if (nonEmpty.length === 0) return null;

  const grandTotal = nonEmpty.reduce(
    (sum, g) => sum + g.rows.reduce((s, r) => s + r.count, 0),
    0,
  );
  // Biggest institution first; types within already sorted by the builder.
  const ordered = [...nonEmpty].sort(
    (a, b) =>
      b.rows.reduce((s, r) => s + r.count, 0) -
      a.rows.reduce((s, r) => s + r.count, 0),
  );

  return (
    // `contain:paint` keeps a wide table from expanding the mobile layout
    // viewport — see the note in CourtYearMatrix.
    <div className="overflow-x-auto [contain:paint]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("dataQuality.materialsBySource.table.source", "Source")}</TableHead>
            <TableHead>{t("dataQuality.materialsBySource.table.type", "Document type")}</TableHead>
            <TableHead className="text-right">
              {t("dataQuality.materialsBySource.table.count", "Documents")}
            </TableHead>
            <TableHead className="text-right">
              {t("dataQuality.materialsBySource.table.share", "Share")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((group) =>
            group.rows.map((r, i) => (
              <TableRow key={`${group.key}:${r.key}`} className={i === 0 ? "border-t-2" : undefined}>
                {i === 0 && (
                  // A real <th> so scope="rowgroup" is valid for assistive tech;
                  // classes mirror TableCell's body styling (th defaults to
                  // bold/centered header styling otherwise).
                  <th
                    rowSpan={group.rows.length}
                    className="font-table-cell p-4 text-left align-top font-medium text-foreground"
                    scope="rowgroup"
                  >
                    {group.source}
                  </th>
                )}
                <TableCell className="text-muted-foreground">{r.type}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-foreground">
                  {r.count.toLocaleString(i18n.language)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {grandTotal > 0 ? ((r.count / grandTotal) * 100).toFixed(1) : "0.0"}%
                </TableCell>
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </div>
  );
}
