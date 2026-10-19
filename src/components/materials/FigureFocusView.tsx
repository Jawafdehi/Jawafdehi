/**
 * One chart, on its own address — the figure counterpart of TableFocusView.
 *
 * Reached at `…/material/<tail>?figure=<key>`. Same bargain as a table: the
 * listing row expands in place for a glance, and this exists for the two things
 * an inline expansion cannot do — give the chart the whole page, and give a
 * reader something they can send to someone else. A chart in a government
 * report is a claim about public money; an uncitable one is a claim nobody can
 * check.
 *
 * Keyed on `key`, never `ordinal`: ordinals are recomputed on every ingest, so
 * a saved link keyed on one would later resolve to a DIFFERENT chart.
 *
 * As with tables, nothing links here from a crawlable surface — the listing
 * rows are disclosures and the only way in is the explicit affordance beside
 * the page number. Making these discoverable is a pre-render budget decision,
 * not a UI one.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMaterialFigure } from "@/services/datalake-api";
import { FigureBody } from "./DocumentContentPanel";

export function FigureFocusView({
  tail,
  figureKey,
  backTo,
}: {
  tail: string;
  figureKey: string;
  backTo: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["material-content-figure", tail, figureKey],
    queryFn: () => getMaterialFigure(tail, figureKey),
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
          No such chart in this document.
        </p>
      ) : null}

      {data ? (
        <>
          <h2 className="text-xl font-semibold text-foreground">
            {data.title.trim() || `Chart ${data.ordinal}`}
          </h2>
          {/* The page, and nothing else. The chart TYPE was here and said
              "pie" above a pie — the reader can see what shape it is, and the
              word was the pipeline's vocabulary rather than the document's. */}
          <p className="mt-1 text-sm text-muted-foreground">
            Page {data.page_no} of this report
          </p>

          <div className="mt-4">
            <FigureBody figure={data} />
          </div>
        </>
      ) : null}
    </div>
  );
}
