import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface MaterialsTableItem {
  label: string;
  count: number;
}

/**
 * A plain two-column table (label + document count, with a share %) for the
 * evidence breakdowns. Replaces the lollipop chart: same data, sorted by
 * magnitude, but read as a table. `nameHeader` labels the first column
 * ("Source" / "Document type"); the count and share headers are i18n'd here.
 */
export function MaterialsTable({
  items,
  nameHeader,
}: {
  items: MaterialsTableItem[];
  nameHeader: string;
}) {
  const { t } = useTranslation();
  const data = [...items].sort((a, b) => b.count - a.count);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (data.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{nameHeader}</TableHead>
            <TableHead className="text-right">
              {t("dataQuality.materialsBySource.table.count", "Documents")}
            </TableHead>
            <TableHead className="text-right">
              {t("dataQuality.materialsBySource.table.share", "Share")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d) => (
            <TableRow key={d.label}>
              <TableCell className="text-foreground">{d.label}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-foreground">
                {d.count.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {total > 0 ? ((d.count / total) * 100).toFixed(1) : "0.0"}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
