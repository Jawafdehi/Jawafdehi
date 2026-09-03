import { Fragment } from "react";

import type { ReactNode } from "react";

/**
 * Rendering search matches as highlights.
 *
 * Two sources, because the API highlights only one field:
 *
 *  - `snippet` arrives pre-marked with `<em>` around the terms OpenSearch
 *    actually matched, including stemmed and fuzzy hits the reader never
 *    typed. That is better than anything the client could infer, so it is
 *    used as given.
 *  - `title` arrives plain, so its matches are found here by comparing
 *    against the query text.
 *
 * Both paths build React nodes. NEITHER uses dangerouslySetInnerHTML: the
 * snippet is server-side-assembled text drawn from document bodies, so it is
 * exactly the kind of string that must never be injected as markup.
 */

const MARK_CLASS = "rounded-[2px] bg-search-highlight px-0.5 text-foreground";

/** Splits on `<em>…</em>` while keeping the delimiters. */
const EM_SEGMENT = /(<em>[\s\S]*?<\/em>)/g;
const EM_CONTENT = /^<em>([\s\S]*?)<\/em>$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Render an API snippet, turning its `<em>` runs into highlights. Any other
 * tag is dropped rather than shown as literal text — the field is documented
 * as carrying `<em>` only, so anything else is treated as markup to strip.
 */
export function renderSnippetHighlights(snippet: string): ReactNode {
  if (!snippet) return null;
  const emOnly = snippet.replace(/<(?!\/?em>)[^>]*>/g, "");
  const segments = emOnly.split(EM_SEGMENT).filter(Boolean);
  return segments.map((segment, index) => {
    const marked = EM_CONTENT.exec(segment);
    const key = `${index}-${segment}`;
    if (!marked) return <Fragment key={key}>{segment}</Fragment>;
    return (
      <mark className={MARK_CLASS} key={key}>
        {marked[1]}
      </mark>
    );
  });
}

/**
 * Render plain text with the query's terms highlighted.
 *
 * Deliberately conservative — a literal, case-insensitive match on each
 * whitespace-separated term. It will miss what the index matched by stem or
 * fuzz, and that asymmetry is the right way round: a missed highlight reads
 * as ordinary text, whereas guessing at stems would mark the wrong span in a
 * person's name on an accountability record.
 *
 * Single characters are skipped; in Devanagari a lone character is usually a
 * matra or conjunct fragment that would speckle the line with marks.
 */
export function renderTextHighlights(text: string, query?: string): ReactNode {
  if (!text) return null;
  const terms = (query || "")
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .map(escapeRegExp);
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  const segments = text.split(pattern).filter(Boolean);
  // split() with one capture group alternates text/match; re-test rather than
  // rely on index parity, which breaks when the text starts with a match.
  return segments.map((segment, index) => {
    const key = `${index}-${segment}`;
    if (!new RegExp(`^(?:${terms.join("|")})$`, "i").test(segment)) {
      return <Fragment key={key}>{segment}</Fragment>;
    }
    return (
      <mark className={MARK_CLASS} key={key}>
        {segment}
      </mark>
    );
  });
}
