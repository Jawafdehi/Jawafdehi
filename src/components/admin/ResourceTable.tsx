import { useCallback, useEffect, useState } from "react";
import { adminErrorMessage, type Paginated } from "@/services/admin-api";
import { FormError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";

export interface Column<T> {
  header: string;
  // Cell renderer for a row. Kept liberal — most data-lake/Jawafdehi rows are loosely
  // typed Record<string, unknown> off the read plane.
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface ResourceTableProps<T> {
  title: string;
  description?: string;
  columns: Column<T>[];
  // Loader returning a DRF-paginated page. `page` is 1-based.
  fetchPage: (page: number) => Promise<Paginated<T>>;
  pageSize?: number;
  rowKey: (row: T) => string;
  // Optional action node rendered next to Refresh (e.g. a "New" button).
  headerAction?: React.ReactNode;
  // Optional row click handler — makes rows clickable (e.g. to an edit page).
  onRowClick?: (row: T) => void;
}

// A generic paginated table over a DRF list endpoint. Used by the data-lake +
// Jawafdehi admin pages. Supports an optional header action and row-click.
export default function ResourceTable<T>({
  title,
  description,
  columns,
  fetchPage,
  pageSize = 25,
  rowKey,
  headerAction,
  onRowClick,
}: ResourceTableProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPage(p);
        setRows(res.results ?? []);
        setCount(res.count ?? 0);
        setHasNext(Boolean(res.next));
      } catch (err) {
        setError(adminErrorMessage(err, `Failed to load ${title.toLowerCase()}`));
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, title],
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count || page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {count.toLocaleString()} total
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(page)}
            disabled={loading}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {headerAction}
        </div>
      </div>

      <FormError message={error} />

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nothing to show.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={onRowClick ? "cursor-pointer" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <TableCell key={c.header} className={c.className}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {from}–{to} of {count.toLocaleString()}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
