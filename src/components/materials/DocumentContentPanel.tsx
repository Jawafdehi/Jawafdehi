/**
 * The "Contents" tab of a material page: the STRUCTURE read out of the source
 * document — its ruled tables and its charts — served by
 * `/api/materials/<tail>/content`.
 *
 * **The document's pages are not here.** They are its transcript, and a
 * transcript is something you read continuously rather than unfold one row at
 * a time; it has its own reader (`TranscriptReader`), opened from the material
 * page. Listing 446 page stubs beside 145 tables also buried the two things
 * this tab exists to expose.
 *
 * Three things this component is deliberate about.
 *
 * **It is a table of contents, not a rendered document.** Each section fetches
 * its listing when opened and each row fetches its own markdown when expanded.
 * One table reaches 170 KiB, so a panel that loaded its contents eagerly would
 * be unusable on precisely the documents worth reading.
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
import { BarChart3, ChevronDown, FileSpreadsheet } from "lucide-react";

import { lazyChart } from "@/components/charts/lazy";
import { chartKind, pieIsSafe, plotFigure, tooManySeries } from "@/lib/content-figure";
import type { ContentFigureChartProps } from "./ContentFigureChart";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/ui/search-bar";
import {
  getMaterialTable,
  listMaterialFigures,
  listMaterialTables,
  type ContentFigure,
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

/**
 * One chart, once its row is open.
 *
 * Mounted only on expand, which is what keeps recharts out of this page's work
 * until a reader actually asks for a chart — and what stops a 46-figure report
 * from drawing all 46 the moment the section opens.
 *
 * Carries no rules of its own. The page it came from is cited by the row's
 * right-hand page number, table-of-contents style, so a caption here would say
 * the same thing twice and put a line under the chart to do it.
 */
function FigureBody({ figure }: { figure: ContentFigure }) {
  // Which of label/series is the category axis is detected from the data, not
  // taken from the field names — the dataset uses both conventions. See
  // lib/content-figure.ts.
  const plotted = plotFigure(figure.points);
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
    <>
      {plotted.hasEstimates ? (
        <p className="mb-3 text-sm leading-6 text-muted-foreground">
          <span aria-hidden="true">{ESTIMATE_MARK}</span> marks a value read from the
          chart image rather than a printed figure
          {drawable && kind === "line" ? "; those points are drawn hollow" : ""}.
        </p>
      ) : null}

      {drawable ? (
        <FigureChart
          figure={plotted}
          chartType={figure.chart_type}
          unit={figure.unit}
          title={nepaliSafe(figure.title, "Chart")}
        />
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          {tooManySeries(plotted)
            ? `This figure carries ${plotted.series.length} series — more than can be told
               apart by colour, so it is not redrawn. The values follow.`
            : `This figure is a ${figure.chart_type.replace(/[_-]+/g, " ")}, which we do not
               redraw — approximating it would misrepresent the source. The values follow.`}
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
    </>
  );
}

// ─── tables ─────────────────────────────────────────────────────────────────


/**
 * One row of a contents listing — a table or a chart — closed until asked for.
 *
 * Laid out like a table of contents: the title runs left, the page number sits
 * hard right in tabular figures so the column of them lines up down the list.
 * The body MOUNTS on open rather than being hidden with CSS, which is what
 * makes "nothing is fetched or drawn until you ask" true rather than merely
 * visual.
 */
function ContentRow({
  title,
  pageNo,
  note,
  children,
}: {
  title: string;
  pageNo: number;
  note?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-3 py-3 text-left hover:bg-muted/40"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 break-words text-base text-foreground">
          {title}
        </span>
        {note ? (
          <span className="shrink-0 text-sm text-muted-foreground">{note}</span>
        ) : null}
        <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
          {pageNo}
        </span>
      </button>

      {open ? <div className="pb-5 pl-7">{children}</div> : null}
    </li>
  );
}

/**
 * The placeholder a table shows while its markdown is in flight.
 *
 * Shaped from the STUB's own `n_rows`/`n_cols`, which the listing already
 * carries, so the placeholder is the size of the thing that replaces it. A
 * fixed grey block told a reader nothing about what was coming and jumped the
 * page when a 60-row table landed where a 3-row box had been.
 */
function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  // Bounded for the same reason the real render is: the widest table in the
  // corpus is 2,979 x 65, and a placeholder has no business drawing that.
  const r = Math.min(Math.max(rows, 2), 8);
  const c = Math.min(Math.max(cols, 1), 6);

  return (
    <div aria-hidden="true" className="space-y-2">
      <div className="flex gap-3">
        {Array.from({ length: c }, (_, i) => (
          <Skeleton key={i} className="h-5 flex-1 bg-muted-foreground/20" />
        ))}
      </div>
      {Array.from({ length: r }, (_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: c }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A table's markdown, fetched on the open that mounted this. */
function TableBody({ tail, stub }: { tail: string; stub: ContentTableStub }) {
  const [showAll, setShowAll] = useState(false);
  // One report's tables come to ~830 KiB, which is why `?type=table` returns
  // stubs and the markdown is addressable only one table at a time.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["material-content-table", tail, stub.key],
    queryFn: () => getMaterialTable(tail, stub.key),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <TableSkeleton rows={stub.n_rows} cols={stub.n_cols} />;
  if (isError)
    return (
      <p className="text-sm text-muted-foreground">This table could not be loaded.</p>
    );
  if (!data) return null;

  return (
    // Horizontally scrollable: these are government tables, some 65 columns
    // wide, and they must not blow out the page on mobile.
    <div className="overflow-x-auto">
      <MarkdownTable
        markdown={data.markdown}
        showAll={showAll}
        onShowAll={() => setShowAll(true)}
      />
    </div>
  );
}

function TableRow({ tail, stub }: { tail: string; stub: ContentTableStub }) {
  return (
    <ContentRow
      title={nepaliSafe(tableLabel(stub), `Page ${stub.page_no}`)}
      pageNo={stub.page_no}
      note={stub.fidelity === "ocr_vision" ? "read by OCR" : undefined}
    >
      <TableBody tail={tail} stub={stub} />
    </ContentRow>
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
/**
 * Whether a cell is a figure rather than prose, in EITHER script.
 *
 * Worth detecting because alignment is what makes a column of numbers readable:
 * left-aligned, `10,245` and `263` do not line up on their digits and the eye
 * cannot compare them down the column. These tables mix scripts freely — a
 * single CIAA table carries `10,245` beside `१९४८८` — so both numeral ranges
 * count, along with the separators, percent signs and dashes that travel with
 * them. Anything containing a letter is prose and stays left-aligned.
 */
const DIGITS = /[0-9\u0966-\u096F]/;
const NON_NUMERIC = /[^\d\u0966-\u096F\s.,%()+\-–—/]/;

function isFigure(cell: string): boolean {
  const v = cell.trim();
  return v !== "" && DIGITS.test(v) && !NON_NUMERIC.test(v);
}

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
      {/* Horizontal rules only, not a full grid: these tables run to five
          columns of mixed Devanagari prose and figures, and boxing every cell
          turns the page into a spreadsheet the eye cannot scan down. The header
          sticks because the longest table here is 668 rows. */}
      <table className="w-max min-w-full border-collapse text-[0.95rem]">
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                scope="col"
                className={`min-w-[7rem] max-w-[20rem] border-b-2 border-border bg-background px-3 py-2 align-bottom font-semibold text-foreground ${
                  isFigure(cell) ? "text-right" : "text-left"
                }`}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, r) => (
            <tr
              key={r}
              className="border-b border-border/40 last:border-b-0 even:bg-muted/30"
            >
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`min-w-[7rem] max-w-[20rem] px-3 py-2 align-top text-foreground ${
                    isFigure(cell)
                      ? "whitespace-nowrap text-right tabular-nums"
                      : "text-left"
                  }`}
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

/**
 * A filter over a long listing.
 *
 * 145 tables are not browsable by scrolling, and the list has no natural order
 * a reader can exploit — a table's caption is the only handle most of them
 * have, and 89 of this document's 145 carry none at all. So the filter matches
 * BOTH the visible label and the page number: typing "52" finds page 52 and
 * every table on it, and typing a word finds the captions that contain it.
 *
 * Uses the shared `SearchBar` rather than a bespoke input, with its submit
 * button turned off: this narrows as you type, so there is nothing to submit.
 */
function FilterBox({
  label,
  value,
  onChange,
  shown,
  total,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  shown: number;
  total: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <SearchBar
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-label={label}
        showSubmit={false}
        className="max-w-sm"
      />
      <span className="text-sm text-muted-foreground">
        {shown === total
          ? `${total.toLocaleString()} in all`
          : `${shown.toLocaleString()} of ${total.toLocaleString()}`}
      </span>
    </div>
  );
}

/** A table's handle: its caption where the source printed one, else its number.
 *
 * 89 of this document's 145 tables carry no caption upstream, so the fallback is
 * the common case rather than the exception. It is the ORDINAL — the table's
 * position as a reader counts them — because the row already carries the page
 * number on its right, and repeating that as the title says nothing twice.
 *
 * Display only. Addressing a table by ordinal is a bug (they are recomputed on
 * every ingest); that is what `key` is for. */
function tableLabel(stub: ContentTableStub): string {
  return stub.caption.trim() || `Table ${stub.ordinal}`;
}

function TableList({ tail, items }: { tail: string; items: ContentTableStub[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? items.filter(
        (t) =>
          tableLabel(t).toLowerCase().includes(needle) ||
          String(t.page_no).includes(needle),
      )
    : items;

  return (
    <>
      <FilterBox
        label="Filter tables by caption or page"
        value={q}
        onChange={setQ}
        shown={shown.length}
        total={items.length}
      />
      {shown.length === 0 ? (
        <p className="text-base text-muted-foreground">No table matches that.</p>
      ) : (
        <ul>
          {shown.map((stub) => (
            <TableRow key={stub.key} tail={tail} stub={stub} />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * The placeholder a listing shows while it loads.
 *
 * Rows of the same shape as the real ones — a chevron, a title and a
 * right-hand page number — so the section does not resize under the reader
 * when the listing lands. `count` comes from the material payload, so the
 * placeholder is even the right LENGTH for short sections.
 */
function ListSkeleton({ count }: { count: number }) {
  const rows = Math.min(Math.max(count, 1), 6);

  return (
    <ul aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="flex min-h-11 items-center gap-3 border-b border-border/70 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          <Skeleton
            className="h-4 flex-1"
            style={{ maxWidth: `${70 - ((i * 7) % 25)}%` }}
          />
          <Skeleton className="h-4 w-7 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

/**
 * One collapsible section of the contents — Tables or Charts.
 *
 * The listing is fetched on FIRST OPEN, never on mount: two listings are two
 * requests, and a reader who came for one table should not pay for every chart
 * in the report to get it. `enabled` is what makes that true.
 *
 * `count` is NOT displayed. It sizes the loading placeholder and decides
 * whether the section exists at all, but a number beside the title competed
 * with the titles themselves for the reader's eye.
 */
function ContentSection<T>({
  id,
  title,
  count,
  icon,
  load,
  render,
}: {
  id: string;
  title: string;
  count: number;
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
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
          {icon}
          <span className="text-xl font-semibold text-foreground">{title}</span>
        </button>
      </h3>

      {open ? (
        <div className="pb-6">
          {isLoading ? <ListSkeleton count={count} /> : null}
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
 * opened; each row fetches its own table markdown when expanded. That ordering
 * is not an optimisation — one table reaches 170 KiB, so a panel that loaded
 * its contents eagerly would be unusable on precisely the documents worth
 * reading.
 */
export function DocumentContentPanel({
  tail,
  summary,
}: {
  tail: string;
  summary: MaterialContentSummary;
}) {
  const { tables, figures } = summary;

  return (
    <div className="p-5 md:p-8">
      <ContentSection
        id={`${tail}-tables`}
        title="Tables"
        count={tables}
        icon={<FileSpreadsheet className="h-4 w-4 text-accent" aria-hidden="true" />}
        load={() => listMaterialTables(tail)}
        render={(items) => <TableList tail={tail} items={items} />}
      />

      <ContentSection
        id={`${tail}-figures`}
        title="Charts"
        count={figures}
        icon={<BarChart3 className="h-4 w-4 text-accent" aria-hidden="true" />}
        load={() => listMaterialFigures(tail)}
        render={(items) => (
          <ul>
            {items.map((figure) => (
              <ContentRow
                key={figure.key}
                title={nepaliSafe(figure.title, "Untitled chart")}
                pageNo={figure.page_no}
              >
                <FigureBody figure={figure} />
              </ContentRow>
            ))}
          </ul>
        )}
      />
    </div>
  );
}

export default DocumentContentPanel;
