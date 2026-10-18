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
 * **Nothing links here from a crawlable surface.** The contents listing rows
 * are disclosures, not links; the only way in is the explicit "Link to this
 * table" on an open table. That is deliberate — 145 tables across 40 reports
 * is ~5,800 URLs, and the pre-render already runs against a 20k asset cap. The
 * address exists for a human to cite and share; making it discoverable by a
 * crawler is a separate decision with a budget attached.
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

          {/* Same break-out as an open table in the listing: this view exists
              because 630px of reading column is not where a 14-column
              government table belongs. */}
          <div className="mt-4 overflow-x-auto lg:-mr-6 lg:w-[calc(100vw-6rem)] lg:max-w-[72rem]">
            <MarkdownTableView markdown={data.markdown} />
          </div>
        </>
      ) : null}
    </div>
  );
}
