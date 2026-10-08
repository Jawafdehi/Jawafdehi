/**
 * The "Tables & charts" tab of a material page: the structure recovered from
 * inside the source document, served by `/api/materials/<tail>/extraction`.
 *
 * Three things this component is deliberate about.
 *
 * **Estimated values are marked, everywhere.** A value read off a chart image is
 * a weaker claim than one read from a printed figure, and the dataset tracks the
 * difference per point. Rendering the two identically would launder a guess into
 * a fact, so every estimate carries a marker: `≈` in the table and the tooltip,
 * a hollow dot on a line, and a note above the chart.
 *
 * **The form follows the document.** A figure the report drew as a pie is drawn
 * as a pie, however many slices it has — up to sixteen here. That works because
 * every slice is labelled directly, so the hue is decoration rather than the
 * identity channel and the palette may repeat without the reader losing track.
 * Line, bar and pie go through recharts, lazily (see `FigureChart`), so recharts
 * stays out of this page's chunk — most materials have no extraction at all.
 *
 * What we cannot draw at all, we do not fake: venn diagrams, radars and bubble
 * charts have no honest recharts equivalent (the venn's rows are intersections,
 * so bar lengths would not sum to anything), and they show their numbers
 * instead, expanded. Same for a figure with more series than the palette has
 * hues, where a line has nowhere to put a direct label.
 *
 * **The category axis is detected, not assumed.** The dataset is not consistent
 * about which of `label`/`series` holds it — see `lib/extraction-figure.ts`.
 * Trusting the field names printed one measure name down 35 rows and demoted
 * the fiscal years to a muted secondary column.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileSpreadsheet } from "lucide-react";

import { lazyChart } from "@/components/charts/lazy";
import { chartKind, plotFigure, tooManySeries } from "@/lib/extraction-figure";
import type { ExtractionFigureChartProps } from "./ExtractionFigureChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMaterialExtractionTable,
  type ExtractionFigure,
  type ExtractionTableStub,
  type MaterialExtraction,
} from "@/services/datalake-api";
import { cn } from "@/lib/utils";

/** The marker a reader sees beside any value that was read off a chart image. */
const ESTIMATE_MARK = "≈";

/**
 * Rows rendered before a table is truncated behind a "show all" control.
 *
 * Not cosmetic. The widest table in the CIAA corpus is 2,979 rows by 65 columns;
 * rendering that grid outright is ~190,000 DOM cells and locks the tab up. The
 * header beside each table already states the real dimensions, so a reader can
 * see what they are opting into.
 */
const TABLE_ROW_PREVIEW = 50;

function nepaliSafe(value: string, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatValue(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ─── charts ─────────────────────────────────────────────────────────────────

const FigureChart = lazyChart<ExtractionFigureChartProps>(
  () => import("./ExtractionFigureChart").then((m) => m.default),
  ({ height = 260 }) => <div className="w-full" style={{ height }} />,
);

function FigureCard({ figure }: { figure: ExtractionFigure }) {
  // Which of label/series is the category axis is detected from the data, not
  // taken from the field names — the dataset uses both conventions. See
  // lib/extraction-figure.ts.
  const plotted = plotFigure(figure.points);
  // Must agree with ExtractionFigureChart's own bail-outs, or the table stays
  // collapsed behind a chart that never renders.
  const drawable =
    chartKind(figure.chart_type) !== null && !tooManySeries(plotted);
  const multiSeries = plotted.series.length > 1;

  return (
    <li className="border-b border-border/70 py-6 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-base font-semibold text-foreground">
          {nepaliSafe(figure.title, "Untitled chart")}
        </h4>
        <span className="text-xs text-muted-foreground">page {figure.page_no}</span>
        {figure.unit ? (
          <span className="text-xs text-muted-foreground">{figure.unit}</span>
        ) : null}
      </div>

      {plotted.hasEstimates ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          <span aria-hidden="true">{ESTIMATE_MARK}</span> marks a value read from the
          chart image rather than a printed figure
          {drawable ? "; those points are drawn hollow" : ""}.
        </p>
      ) : null}

      {drawable ? (
        <div className="mt-3">
          <FigureChart
            figure={plotted}
            chartType={figure.chart_type}
            unit={figure.unit}
            title={nepaliSafe(figure.title, "Chart")}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {tooManySeries(plotted)
            ? `This figure carries ${plotted.series.length} series — more than can be told
               apart by colour, so it is not redrawn. The values follow.`
            : `This figure is a ${figure.chart_type.replace(/[_-]+/g, " ")}, which we do not
               redraw — approximating it would misrepresent the source. The values follow.`}
        </p>
      )}

      <details className="mt-3" open={!drawable}>
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Show the numbers
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">
            Data behind the chart “{nepaliSafe(figure.title, "Untitled chart")}” on page{" "}
            {figure.page_no}
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Category</th>
              {multiSeries ? <th scope="col">Series</th> : null}
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {plotted.series.flatMap((series) =>
              series.points.map((point) => (
                <tr key={`${series.name}-${point.category}`} className="align-baseline">
                  {/* The CATEGORY leads, whichever upstream field it came from.
                      Keying this on `label` printed one measure name 35 times
                      and demoted the fiscal years to a muted column. */}
                  <td className="py-1.5 pr-3 text-foreground">{point.category}</td>
                  {multiSeries ? (
                    <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                      {series.name}
                    </td>
                  ) : null}
                  <td className="w-px whitespace-nowrap py-1.5 text-right font-mono text-[13px] tabular-nums text-foreground">
                    {point.estimated ? (
                      <span
                        className="text-muted-foreground"
                        title="Read from the chart image, not a printed figure"
                      >
                        <span aria-hidden="true">{ESTIMATE_MARK}</span>
                        <span className="sr-only">approximately </span>
                      </span>
                    ) : null}
                    {formatValue(point.value)}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </details>

      {figure.notes ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            How these numbers were established
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
            {figure.notes}
          </p>
        </details>
      ) : null}
    </li>
  );
}

// ─── tables ─────────────────────────────────────────────────────────────────

function TableRow({
  tail,
  stub,
}: {
  tail: string;
  stub: ExtractionTableStub;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // Markdown is fetched only when a reader opens the table: one report's tables
  // come to ~830 KiB, which is why the API keeps them off the manifest.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["material-extraction-table", tail, stub.key],
    queryFn: () => getMaterialExtractionTable(tail, stub.key),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const label = nepaliSafe(stub.caption, `Table on page ${stub.page_no}`);

  return (
    <li className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-start gap-3 py-3 text-left hover:bg-muted/40"
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm text-foreground">{label}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            page {stub.page_no} · {stub.n_rows}×{stub.n_cols}
            {stub.fidelity === "ocr_vision" ? " · read by OCR" : ""}
          </span>
        </span>
      </button>

      {open ? (
        <div className="pb-4 pl-7">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : isError ? (
            <p className="text-sm text-muted-foreground">
              This table could not be loaded.
            </p>
          ) : data ? (
            // Horizontally scrollable: these are government tables, some 65
            // columns wide, and they must not blow out the page on mobile.
            <div className="overflow-x-auto">
              <MarkdownTable
                markdown={data.markdown}
                showAll={showAll}
                onShowAll={() => setShowAll(true)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Render a markdown pipe-table.
 *
 * Hand-parsed rather than handed to react-markdown: these tables come out of OCR
 * and are routinely ragged — merged header cells arrive as empty strings, row
 * lengths disagree with the header — and a markdown renderer silently drops the
 * cells that overflow. Splitting the pipes ourselves keeps every cell the
 * document actually had.
 */
function MarkdownTable({
  markdown,
  showAll,
  onShowAll,
}: {
  markdown: string;
  showAll: boolean;
  onShowAll: () => void;
}) {
  const rows = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    // The `| --- | --- |` separator carries no data.
    .filter((line) => !/^\|[\s|:-]*\|?$/.test(line))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

  if (rows.length === 0) {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
        {markdown}
      </pre>
    );
  }

  const [header, ...body] = rows;
  const truncated = !showAll && body.length > TABLE_ROW_PREVIEW;
  const visible = truncated ? body.slice(0, TABLE_ROW_PREVIEW) : body;

  return (
    <>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className="border border-border/70 bg-muted/50 px-2 py-1.5 text-left align-top font-semibold text-foreground"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className="border border-border/70 px-2 py-1.5 align-top text-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated ? (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-2 min-h-11 text-sm text-primary underline underline-offset-2 hover:no-underline"
        >
          Show all {body.length.toLocaleString()} rows
        </button>
      ) : null}
    </>
  );
}

// ─── panel ──────────────────────────────────────────────────────────────────

export function ExtractionPanel({
  tail,
  extraction,
}: {
  tail: string;
  extraction: MaterialExtraction;
}) {
  const { counts, provenance, tables, figures } = extraction;

  return (
    <div className="p-5 md:p-8">
      <p className="mb-6 max-w-3xl text-sm leading-6 text-muted-foreground">
        {counts.tables.toLocaleString()} table{counts.tables === 1 ? "" : "s"} and{" "}
        {counts.figures.toLocaleString()} chart{counts.figures === 1 ? "" : "s"} were
        read out of this document
        {counts.points > 0
          ? `, recovering ${counts.points.toLocaleString()} chart data point${
              counts.points === 1 ? "" : "s"
            }`
          : ""}
        . Figures are reproduced as they were published; nothing here is corrected
        or recalculated.
      </p>

      {figures.length > 0 ? (
        <section aria-labelledby="extraction-charts-heading">
          <h3
            id="extraction-charts-heading"
            className="text-lg font-semibold text-foreground"
          >
            Charts
          </h3>
          <ul className="mt-1">
            {figures.map((figure) => (
              <FigureCard key={figure.key} figure={figure} />
            ))}
          </ul>
        </section>
      ) : null}

      {tables.length > 0 ? (
        <section
          aria-labelledby="extraction-tables-heading"
          className={figures.length > 0 ? "mt-10" : undefined}
        >
          <h3
            id="extraction-tables-heading"
            className="flex items-center gap-2 text-lg font-semibold text-foreground"
          >
            <FileSpreadsheet className="h-4 w-4 text-accent" aria-hidden="true" />
            Tables
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a table to read it.
          </p>
          <ul className="mt-3">
            {tables.map((stub) => (
              <TableRow key={stub.key} tail={tail} stub={stub} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 border-t border-border/70 pt-4 text-xs leading-5 text-muted-foreground">
        Extracted from the published PDF by the{" "}
        <a
          href={`https://huggingface.co/datasets/${provenance.dataset}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:no-underline"
        >
          {provenance.dataset}
        </a>{" "}
        dataset
        {provenance.dataset_revision
          ? ` (revision ${provenance.dataset_revision.slice(0, 7)})`
          : ""}
        , document <code className="font-mono">{provenance.doc_id}</code>
        {provenance.page_count ? ` · ${provenance.page_count} pages` : ""}
        {provenance.text_source === "vision_ocr"
          ? " · the PDF carries no text layer, so the text was read by OCR"
          : ""}
        {provenance.figures_verdict === "needs_work"
          ? " · the chart readings for this report are flagged as needing review"
          : ""}
        .
      </p>
    </div>
  );
}

export default ExtractionPanel;
