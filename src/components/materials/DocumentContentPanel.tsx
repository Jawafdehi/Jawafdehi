/**
 * The "Contents" tab of a material page: what was read out of the source
 * document — its pages, its ruled tables and its charts — served by
 * `/api/materials/<tail>/content`.
 *
 * Four things this component is deliberate about.
 *
 * **It is a table of contents, not a rendered document.** Each section fetches
 * its listing when opened and each row fetches its own text when expanded. A
 * 446-page report's pages ARE its transcript and one table reaches 170 KiB, so
 * a panel that loaded its contents eagerly would be unusable on precisely the
 * documents worth reading.
 *
 * **An empty page is never rendered as nothing.** `coverage_state` separates a
 * page that is blank in the source from one we hold and could not read, and the
 * Pages section says up front how many fall in the second group. Collapsing the
 * two reports a failure of our OCR as an absence of content in the document.
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
 * about which of `label`/`series` holds it — see `lib/content-figure.ts`.
 * Trusting the field names printed one measure name down 35 rows and demoted
 * the fiscal years to a muted secondary column.
 */

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileSpreadsheet, FileText } from "lucide-react";

import { lazyChart } from "@/components/charts/lazy";
import { chartKind, pieIsSafe, plotFigure, tooManySeries } from "@/lib/content-figure";
import type { ContentFigureChartProps } from "./ContentFigureChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMaterialPage,
  getMaterialTable,
  listMaterialFigures,
  listMaterialPages,
  listMaterialTables,
  type ContentFigure,
  type ContentPageStub,
  type ContentTableStub,
  type MaterialContentSummary,
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

const FigureChart = lazyChart<ContentFigureChartProps>(
  () => import("./ContentFigureChart").then((m) => m.default),
  ({ height = 260 }) => <div className="w-full" style={{ height }} />,
);

function FigureCard({ figure }: { figure: ContentFigure }) {
  // Which of label/series is the category axis is detected from the data, not
  // taken from the field names — the dataset uses both conventions. See
  // lib/content-figure.ts.
  const plotted = plotFigure(figure.points);
  // Must agree with ContentFigureChart's own bail-outs, or the table stays
  // collapsed behind a chart that never renders.
  // Must agree with ContentFigureChart's bail-outs EXACTLY, or the table stays
  // collapsed behind a chart that never renders. The pie clause is the one that
  // bit: a multi-series pie is undrawable, and 15 of this corpus's 477 figures
  // are exactly that.
  const kind = chartKind(figure.chart_type);
  const drawable =
    kind !== null &&
    !tooManySeries(plotted) &&
    (kind !== "pie" || pieIsSafe(plotted));
  const multiSeries = plotted.series.length > 1;

  return (
    <li className="border-b border-border/70 py-6 last:border-b-0">
      <h4 className="text-lg font-semibold text-foreground">
        {nepaliSafe(figure.title, "Untitled chart")}
      </h4>

      {plotted.hasEstimates ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          <span aria-hidden="true">{ESTIMATE_MARK}</span> marks a value read from the
          chart image rather than a printed figure
          {drawable && kind === "line" ? "; those points are drawn hollow" : ""}.
        </p>
      ) : null}

      {drawable ? (
        <figure className="mt-3">
          <FigureChart
            figure={plotted}
            chartType={figure.chart_type}
            unit={figure.unit}
            title={nepaliSafe(figure.title, "Chart")}
          />
          <figcaption className="mt-2 text-sm italic text-muted-foreground/80">
            Source: page {figure.page_no} of this report.
          </figcaption>
        </figure>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {tooManySeries(plotted)
            ? `This figure carries ${plotted.series.length} series — more than can be told
               apart by colour, so it is not redrawn. The values follow.`
            : `This figure is a ${figure.chart_type.replace(/[_-]+/g, " ")}, which we do not
               redraw — approximating it would misrepresent the source. The values follow.`}{" "}
          <span className="italic text-muted-foreground/80">
            Source: page {figure.page_no} of this report.
          </span>
        </p>
      )}

      <details className="mt-3" open={!drawable}>
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          Show the numbers
        </summary>
        <table className="mt-2 w-full text-base">
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
                    <td className="py-1.5 pr-3 text-sm text-muted-foreground">
                      {series.name}
                    </td>
                  ) : null}
                  <td className="w-px whitespace-nowrap py-1.5 text-right font-mono text-[15px] tabular-nums text-foreground">
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
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            How these numbers were established
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {figure.notes}
          </p>
        </details>
      ) : null}
    </li>
  );
}

// ─── tables ─────────────────────────────────────────────────────────────────


/** How a page was read, in the reader's words rather than the pipeline's. */
function pageState(state: string): { label: string; muted: boolean } {
  if (state === "anchored") return { label: "", muted: false };
  if (state === "ocr_vision") return { label: "read by OCR", muted: false };
  if (state === "blank") return { label: "blank page", muted: true };
  // Everything else — gap, folded, ocr_unread, or a value the upstream adds
  // later — means we hold the page and could not read it. Say that, rather
  // than letting an empty page pass for an empty one.
  return { label: "could not be read", muted: true };
}

function PageRow({ tail, stub }: { tail: string; stub: ContentPageStub }) {
  const [open, setOpen] = useState(false);
  // One page's text, fetched on open. A document's pages ARE its transcript, so
  // the listing deliberately carries none of it.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["material-content-page", tail, stub.page_no],
    queryFn: () => getMaterialPage(tail, stub.page_no),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const state = pageState(stub.coverage_state);

  return (
    <li className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-baseline gap-3 py-3 text-left"
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
        <span className="font-medium text-foreground">Page {stub.page_no}</span>
        {state.label ? (
          <span className="text-sm text-muted-foreground">{state.label}</span>
        ) : null}
        {stub.n_table_blocks > 0 ? (
          <span className="text-sm text-muted-foreground">
            {stub.n_table_blocks} table{stub.n_table_blocks === 1 ? "" : "s"}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="pb-4 pl-7">
          {isLoading ? <Skeleton className="h-20 w-full" /> : null}
          {isError ? (
            <p className="text-base text-muted-foreground">
              That page could not be loaded. Try again.
            </p>
          ) : null}
          {data ? (
            data.text.trim() ? (
              <p className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-foreground">
                {data.text}
              </p>
            ) : (
              // An empty transcript is ambiguous on its own, and the ambiguity
              // matters: a reader must not read our failure as the document's
              // silence.
              <p className="text-base leading-7 text-muted-foreground">
                {state.muted && stub.coverage_state === "blank"
                  ? "This page is blank in the source document."
                  : "We hold this page but could not read it. Open the original PDF to see it."}
              </p>
            )
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function TableRow({
  tail,
  stub,
}: {
  tail: string;
  stub: ContentTableStub;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // Markdown is fetched only when a reader opens the table: one report's tables
  // come to ~830 KiB, which is why the API keeps them off the manifest.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["material-content-table", tail, stub.key],
    queryFn: () => getMaterialTable(tail, stub.key),
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
          <span className="block break-words text-base text-foreground">{label}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
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
    // The `| --- | --- |` separator carries no data. Matched on a RUN of
    // dashes, not on any dash: a lone `-` in a cell is a value in these tables
    // — it is how the source writes nil — and `| - | - |` is a data row, not a
    // rule. An all-blank row is dropped as the merged-cell artefact it is.
    .filter((line) => !/^\|[\s|:]*(?:-{3,}[\s|:]*)+\|?$/.test(line))
    .filter((line) => !/^\|[\s|]*\|?$/.test(line))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

  if (rows.length === 0) {
    return (
      <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
        {markdown}
      </pre>
    );
  }

  const [header, ...body] = rows;
  const truncated = !showAll && body.length > TABLE_ROW_PREVIEW;
  const visible = truncated ? body.slice(0, TABLE_ROW_PREVIEW) : body;

  return (
    <>
      <table className="w-full border-collapse text-base">
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

/**
 * One collapsible section of the contents — Pages, Tables or Charts.
 *
 * The listing is fetched on FIRST OPEN, never on mount. A document's three
 * listings are three requests, and a reader who came for one table should not
 * pay for 446 page stubs to get it. `enabled` is what makes that true; the
 * count in the header comes from the material payload, so the section can label
 * itself honestly before it has fetched anything.
 */
function ContentSection<T>({
  id,
  title,
  count,
  hint,
  icon,
  load,
  render,
}: {
  id: string;
  title: string;
  count: number;
  hint: string;
  icon?: ReactNode;
  load: () => Promise<T[] | null>;
  render: (items: T[]) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["datalake-material-content", id],
    queryFn: load,
    enabled: open,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (count < 1) return null;

  return (
    <section aria-labelledby={`${id}-heading`} className="border-t border-border/70">
      <h3 id={`${id}-heading`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 py-4 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
          {icon}
          <span className="text-xl font-semibold text-foreground">{title}</span>
          <span className="text-base text-muted-foreground">
            {count.toLocaleString()}
          </span>
        </button>
      </h3>

      {open ? (
        <div className="pb-6">
          <p className="mb-3 text-base leading-7 text-muted-foreground">{hint}</p>
          {isLoading ? <Skeleton className="h-24 w-full" /> : null}
          {isError ? (
            <p className="text-base text-muted-foreground">
              That list could not be loaded. Try again.
            </p>
          ) : null}
          {data ? render(data) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The "Contents" tab of a material page: what was read out of the source
 * document, served by `/api/materials/<tail>/content`.
 *
 * **Nothing heavy is fetched until it is asked for.** The tab renders from the
 * counts already on the material payload; each section fetches its listing when
 * opened; each row fetches its own page text or table markdown when expanded.
 * That ordering is not an optimisation — a 446-page report's pages ARE its
 * transcript and one table reaches 170 KiB, so a panel that loaded its contents
 * eagerly would be unusable on precisely the documents worth reading.
 */
export function DocumentContentPanel({
  tail,
  summary,
}: {
  tail: string;
  summary: MaterialContentSummary;
}) {
  const { pages, pages_read, tables, figures, points, provenance } = summary;
  const unread = Math.max(pages - pages_read, 0);

  return (
    <div className="p-5 md:p-8">
      <p className="mb-6 max-w-3xl text-lg leading-8 text-muted-foreground">
        {tables.toLocaleString()} table{tables === 1 ? "" : "s"} and{" "}
        {figures.toLocaleString()} chart{figures === 1 ? "" : "s"} were read out of
        this document
        {points > 0
          ? `, recovering ${points.toLocaleString()} chart data point${
              points === 1 ? "" : "s"
            }`
          : ""}
        . Figures are reproduced as they were published; nothing here is corrected
        or recalculated.
      </p>

      <ContentSection
        id={`${tail}-pages`}
        title="Pages"
        count={pages}
        icon={<FileText className="h-4 w-4 text-accent" aria-hidden="true" />}
        hint={
          unread > 0
            ? `Select a page to read it. ${unread.toLocaleString()} of these pages could not be read, and open empty — that is a limit of our transcription, not a blank page.`
            : "Select a page to read it."
        }
        load={() => listMaterialPages(tail)}
        render={(items) => (
          <ul>
            {items.map((stub) => (
              <PageRow key={stub.page_no} tail={tail} stub={stub} />
            ))}
          </ul>
        )}
      />

      <ContentSection
        id={`${tail}-tables`}
        title="Tables"
        count={tables}
        icon={<FileSpreadsheet className="h-4 w-4 text-accent" aria-hidden="true" />}
        hint="Select a table to read it."
        load={() => listMaterialTables(tail)}
        render={(items) => (
          <ul>
            {items.map((stub) => (
              <TableRow key={stub.key} tail={tail} stub={stub} />
            ))}
          </ul>
        )}
      />

      <ContentSection
        id={`${tail}-figures`}
        title="Charts"
        count={figures}
        hint="Select a chart to see it drawn, with the numbers behind it."
        load={() => listMaterialFigures(tail)}
        render={(items) => (
          <ul>
            {items.map((figure) => (
              <FigureCard key={figure.key} figure={figure} />
            ))}
          </ul>
        )}
      />

      <p className="mt-10 border-t border-border/70 pt-4 text-sm leading-6 text-muted-foreground">
        Read out of the published PDF by the{" "}
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
        {pages ? ` · ${pages.toLocaleString()} pages` : ""}
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

export default DocumentContentPanel;
