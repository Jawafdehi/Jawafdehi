/**
 * The transcript reader: a document's recovered text, read continuously.
 *
 * This is deliberately NOT the PDF viewer with different content in it. The two
 * look alike on purpose but answer to different facts:
 *
 * * A page here is addressed by its **printed folio**, not by its index in a
 *   file — which is what makes "page 212" checkable against the published PDF.
 * * A page can exist and be unreadable. The PDF viewer has no concept for that;
 *   this one must, because rendering a failed transcription as an empty page
 *   reports our gap as the document's silence.
 *
 * Pages arrive a WINDOW at a time via the API's inclusive `from`/`to` range, so
 * a 446-page report costs ~9 requests rather than 446. The window is bounded by
 * `MAX_PAGE_SPAN`; past it the API answers 400 naming the cap rather than
 * truncating, so the cap is respected here rather than discovered there.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMaterialPageRange,
  listMaterialPages,
  MAX_PAGE_SPAN,
  type ContentPageStub,
} from "@/services/datalake-api";

/**
 * Pages per request.
 *
 * Under `MAX_PAGE_SPAN` on purpose: the cap is the API's refusal threshold, not
 * a target. The corpus averages ~1.3 KB of text per page, so 20 pages is ~26 KB
 * — a window a reader can scroll through without a wait at either end.
 */
const WINDOW = 20;

/** How a page was read, in the reader's words rather than the pipeline's. */
function pageState(state: string): { label: string; readable: boolean } {
  if (state === "anchored") return { label: "", readable: true };
  if (state === "ocr_vision") return { label: "read by OCR", readable: true };
  if (state === "blank") return { label: "blank in the source", readable: false };
  // Everything else — gap, folded, ocr_unread, or a value the upstream adds
  // later — means we hold the page and could not read it.
  return { label: "could not be read", readable: false };
}

function windowStart(page: number, first: number) {
  // Windows are anchored to the document's FIRST folio, not to 1. A report
  // whose folios start at 0 (an unparseable upstream folio coerces to 0) would
  // otherwise put a one-page window at the front of every jump.
  return first + Math.floor((page - first) / WINDOW) * WINDOW;
}

function OnePage({
  stub,
  text,
}: {
  stub: ContentPageStub;
  text: string | undefined;
}) {
  const body = (text ?? "").trim();
  const state = pageState(stub.coverage_state);

  // `coverage_state` may only ever explain an ABSENCE. Upstream marks some
  // pages `blank` that nonetheless carry text — 2 of the 446 in the 35th CIAA
  // report, one of them 253 characters — and printing "blank in the source"
  // above text a reader can plainly see contradicts the evidence on screen and
  // discredits the label everywhere else it appears. Where we have text, the
  // text is the claim; the only note worth keeping is how it was read.
  const note = body ? (state.readable ? state.label : "") : state.label;

  return (
    <article
      id={`transcript-page-${stub.page_no}`}
      className="mx-auto mb-6 max-w-3xl rounded-sm bg-paper px-6 py-8 text-paper-foreground shadow-2xl sm:px-10"
    >
      <div className="mb-4 flex items-baseline gap-3 border-b border-paper-line pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-paper-muted">
          Page {stub.page_no}
        </h2>
        {note ? <span className="text-sm text-paper-muted">{note}</span> : null}
      </div>

      {body ? (
        <p className="font-paragraph whitespace-pre-wrap break-words text-base leading-8">
          {body}
        </p>
      ) : (
        // An empty transcript is ambiguous on its own, and the ambiguity is the
        // whole point: a reader must not take our failure for the document's
        // silence.
        <p className="text-base leading-7 text-paper-muted">
          {stub.coverage_state === "blank"
            ? "This page is blank in the source document."
            : "We hold this page but could not read it. Open the original PDF to see it."}
        </p>
      )}
    </article>
  );
}

export function TranscriptReader({
  tail,
  title,
  dataset,
  pages,
  pagesRead,
  fullPage = false,
  onClose,
}: {
  tail: string;
  title: string;
  dataset?: string;
  /**
   * `pages` / `pagesRead` come from the material payload's content summary and
   * are shown verbatim. They are NOT recounted from the page stubs: the
   * summary's counters are denormalised from the upstream document row, so a
   * second count here would be a second source of truth, free to disagree with
   * the number the rest of the site quotes. When they are absent the line is
   * omitted rather than guessed.
   */
  pages?: number;
  pagesRead?: number;
  fullPage?: boolean;
  onClose?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // The stub listing is the reader's spine: it is the only thing that says
  // which folios exist and which of them we could read. Fetched once.
  const {
    data: stubs,
    isLoading: stubsLoading,
    isError: stubsError,
  } = useQuery({
    queryKey: ["material-transcript-stubs", tail],
    queryFn: () => listMaterialPages(tail),
    staleTime: 5 * 60 * 1000,
  });

  const firstPage = stubs?.length ? stubs[0].page_no : 1;
  const lastPage = stubs?.length ? stubs[stubs.length - 1].page_no : 1;

  const [start, setStart] = useState<number | null>(null);
  const [jump, setJump] = useState("");

  // Anchor the first window once the spine arrives. Deriving this during render
  // would reset a reader's position every time the listing refetched.
  useEffect(() => {
    if (stubs?.length && start === null) setStart(stubs[0].page_no);
  }, [stubs, start]);

  const from = start ?? firstPage;
  const to = Math.min(from + WINDOW - 1, lastPage);

  const { data: windowPages, isLoading, isError } = useQuery({
    queryKey: ["material-transcript-window", tail, from, to],
    queryFn: () => getMaterialPageRange(tail, from, to),
    enabled: start !== null && Boolean(stubs?.length),
    staleTime: 5 * 60 * 1000,
  });

  const textByPage = useMemo(() => {
    const map = new Map<number, string>();
    for (const page of windowPages ?? []) map.set(page.page_no, page.text);
    return map;
  }, [windowPages]);

  const inWindow = useMemo(
    () => (stubs ?? []).filter((s) => s.page_no >= from && s.page_no <= to),
    [stubs, from, to],
  );

  const goTo = (page: number) => {
    if (!stubs?.length) return;
    const clamped = Math.min(Math.max(page, firstPage), lastPage);
    setStart(windowStart(clamped, firstPage));
    // Guard the METHOD, not just the element: jsdom has no scrollTo, and
    // scrolling is a nicety that must never break the navigation itself.
    scrollRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const coverage =
    pages !== undefined && pagesRead !== undefined
      ? `${pagesRead.toLocaleString()} of ${pages.toLocaleString()} pages readable`
      : "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-code-surface text-white">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-black px-3">
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-white hover:bg-white/10 hover:text-white"
            aria-label="Close the transcript"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        ) : null}

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-danger text-white">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-5 text-white">{title}</p>
          <p className="text-xs text-white/60">
            {coverage ? `Transcript · ${coverage}` : "Transcript"}
          </p>
        </div>

        {!fullPage ? (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden rounded-full text-white hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <a
              href={`/document-viewer?${new URLSearchParams({
                type: "transcript",
                tail,
                title,
                ...(dataset ? { dataset } : {}),
                ...(pages !== undefined ? { pages: String(pages) } : {}),
                ...(pagesRead !== undefined
                  ? { pagesRead: String(pagesRead) }
                  : {}),
              }).toString()}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab
            </a>
          </Button>
        ) : null}
      </div>

      {stubs?.length ? (
        <div className="flex shrink-0 items-center gap-2 bg-code-surface px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-[#303134] px-3 py-2 text-sm text-white/85 shadow-sm">
            <span className="hidden text-white/70 sm:inline">Page</span>
            <input
              className="font-input h-7 w-16 rounded border border-white/20 bg-black/25 px-2 text-center text-white outline-none focus:border-white/60"
              aria-label="Go to page"
              inputMode="numeric"
              value={jump}
              placeholder={String(from)}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "" || /^\d+$/.test(value)) setJump(value);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                const parsed = Number.parseInt(jump, 10);
                if (Number.isFinite(parsed)) goTo(parsed);
              }}
            />
            <span className="text-white/60">
              {from}&ndash;{to} of {lastPage}
            </span>

            <div className="mx-2 h-5 w-px bg-white/15" aria-hidden="true" />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white"
              aria-label="Previous pages"
              disabled={from <= firstPage}
              onClick={() => goTo(from - WINDOW)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white"
              aria-label="Next pages"
              disabled={to >= lastPage}
              onClick={() => goTo(from + WINDOW)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto bg-[#050505] px-4 py-6"
      >
        {stubsLoading ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : null}

        {stubsError || (stubs !== undefined && !stubs?.length) ? (
          <p className="mx-auto max-w-3xl text-sm text-white/70">
            This document has no transcript to read.
          </p>
        ) : null}

        {isError ? (
          <p className="mx-auto max-w-3xl text-sm text-white/70">
            Those pages could not be loaded. Try again.
          </p>
        ) : null}

        {isLoading && stubs?.length ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : null}

        {windowPages
          ? inWindow.map((stub) => (
              <OnePage
                key={stub.page_no}
                stub={stub}
                text={textByPage.get(stub.page_no)}
              />
            ))
          : null}

        {/* The dataset is CC BY-NC 4.0, which REQUIRES attribution naming the
            work. It rides here rather than on the Contents tab so the credit is
            carried once, with the text it actually describes. */}
        {dataset ? (
          <p className="mx-auto max-w-3xl pb-4 text-sm text-white/55">
            Source:{" "}
            <a
              href={`https://huggingface.co/datasets/${dataset}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:no-underline"
            >
              {dataset}
            </a>{" "}
            (CC BY-NC 4.0)
          </p>
        ) : null}
      </div>
    </div>
  );
}
