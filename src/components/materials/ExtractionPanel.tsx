/**
 * The "Tables & charts" tab of a material page: the structure recovered from
 * inside the source document, served by `/api/materials/<tail>/extraction`.
 *
 * Two things this component is deliberate about.
 *
 * **Estimated values are marked, everywhere.** A value read off a chart image is
 * a weaker claim than one read from a printed figure, and the dataset tracks the
 * difference per point. Rendering the two identically would launder a guess into
 * a fact, so every estimate carries a marker and every chart that contains one
 * says so above the numbers.
 *
 * **A chart's data is shown as a table, not re-drawn as a chart.** The corpus
 * holds pies, 3-D pies, venn diagrams, radars and stacked bars; faithfully
 * reproducing them is a different project, and approximating them would
 * misrepresent the source. The inline bar is a magnitude cue on a table, not a
 * reconstruction — so it is omitted entirely where the values are not comparable
 * magnitudes (a chart carrying more than one series, or any negative value).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileSpreadsheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

function FigureCard({ figure }: { figure: ExtractionFigure }) {
  const values = figure.points.map((p) => p.value).filter((v): v is number => v !== null);
  const seriesNames = new Set(figure.points.map((p) => p.series).filter(Boolean));
  // The bar is only honest when every value is a comparable, non-negative
  // magnitude on one series. Otherwise show the numbers alone.
  const comparable = seriesNames.size <= 1 && values.every((v) => v >= 0);
  const max = values.length ? Math.max(...values) : 0;
  const anyEstimated = figure.points.some((p) => p.estimated);
  const showSeries = seriesNames.size > 1;

  return (
    <li className="border-b border-border/70 py-6 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-base font-semibold text-foreground">
          {nepaliSafe(figure.title, "Untitled chart")}
        </h4>
        <span className="text-xs text-muted-foreground">page {figure.page_no}</span>
        {figure.chart_type ? (
          <Badge variant="secondary" className="text-[11px] font-normal">
            {figure.chart_type.replace(/[_-]+/g, " ")}
          </Badge>
        ) : null}
        {figure.unit ? (
          <span className="text-xs text-muted-foreground">{figure.unit}</span>
        ) : null}
      </div>

      {anyEstimated ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          <span aria-hidden="true">{ESTIMATE_MARK}</span> marks a value read from the
          chart image rather than a printed figure.
        </p>
      ) : null}

      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">
          Data behind the chart “{nepaliSafe(figure.title, "Untitled chart")}” on page{" "}
          {figure.page_no}
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Label</th>
            {showSeries ? <th scope="col">Series</th> : null}
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {figure.points.map((point) => (
            <tr key={point.point_index} className="align-baseline">
              <td className="py-1.5 pr-3 text-foreground">
                {nepaliSafe(point.label, "—")}
              </td>
              {showSeries ? (
                <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                  {point.series}
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
              {comparable ? (
                <td className="w-1/3 py-1.5 pl-3">
                  <div
                    className="h-1.5 rounded-sm bg-accent/70"
                    style={{
                      width:
                        max > 0 && point.value !== null
                          ? `${Math.max((point.value / max) * 100, 1)}%`
                          : 0,
                    }}
                    // The numbers beside it are the content; this is decoration.
                    aria-hidden="true"
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

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
