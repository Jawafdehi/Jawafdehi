/**
 * One table, on its own address — the `page` candidate from ContentLayoutLab.
 *
 * Reached at `…/material/<tail>?table=<key>`, which is the point of it: a
 * finding in a government table becomes something a reader can send to someone
 * else, and something a crawler can reach. In an accountability archive that is
 * not a nicety — an uncitable number is a number nobody can check.
 *
 * It is keyed on the table's `key`, never its `ordinal`: ordinals are
 * recomputed on every ingest, so a saved link keyed on one would silently
 * resolve to a DIFFERENT table after the next run. A 200 with the wrong table
 * is worse than a 404.
 *
 * Still DEV-gated through the lab. Shipping it means deciding what a bare
 * `?table=` does to the pre-render budget, which is a separate call — see the
 * note in the PR.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMaterialTable } from "@/services/datalake-api";
import { MarkdownTableView } from "./DocumentContentPanel";

export function TableFocusView({
  tail,
  tableKey,
  backTo,
}: {
  tail: string;
  tableKey: string;
  backTo: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["material-content-table", tail, tableKey],
    queryFn: () => getMaterialTable(tail, tableKey),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="p-5 md:p-8">
      <Link
        to={backTo}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-primary underline underline-offset-2 hover:no-underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to contents
      </Link>

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}

      {isError || (!isLoading && !data) ? (
        <p className="text-base text-muted-foreground">
          No such table in this document.
        </p>
      ) : null}

      {data ? (
        <>
          <h2 className="text-xl font-semibold text-foreground">
            {data.caption.trim() || `Table ${data.ordinal}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Page {data.page_no} of this report · {data.n_rows}×{data.n_cols}
          </p>

          <div className="mt-4 overflow-x-auto">
            <MarkdownTableView markdown={data.markdown} />
          </div>
        </>
      ) : null}
    </div>
  );
}
