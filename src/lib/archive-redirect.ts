// Where the retired browse pages now live. Every search is on /search, typed
// by ?type=, and the old pages' own query strings must survive the move: a
// bookmarked `/courtcases?q=…&court=supreme` or `/materials?q=…&date_from=…`
// should land on the same filtered list, not the unfiltered one.
//
// Pure, with no React and no DOM, because worker.ts imports it to answer the
// old URLs with an edge 301 (crawlers and non-JS clients), while the SPA uses
// the same function for its client-side <Navigate> (in-app history).

export type ArchiveType = "case" | "courtcase" | "material";

/** Params the old pages used under another name. */
const RENAMED: Record<string, string> = {
  // llms.txt advertised /cases?search={name}; /search calls it q.
  search: "q",
  // The retired series page kept its own date range as from/to.
  from: "date_from",
  to: "date_to",
};

/**
 * Params that belonged to the old page and mean nothing on /search: a stale
 * type (the redirect sets its own), and the series page's relative date preset
 * ("last year"), which search expresses as explicit dates instead.
 */
const DROPPED = new Set(["type", "when"]);

/** The /search URL for an old browse URL's query string, typed. */
export function archiveSearchUrl(type: ArchiveType, search: string | URLSearchParams): string {
  const source = typeof search === "string" ? new URLSearchParams(search) : search;
  const next = new URLSearchParams({ type });
  for (const [key, value] of source) {
    if (DROPPED.has(key)) continue;
    next.append(RENAMED[key] ?? key, value);
  }
  return `/search/?${next.toString()}`;
}

/**
 * The retired browse path an edge request is for, or null. `/cases` and every
 * `/cases/page/N` go to case search; `/courtcases` to court-case search. The
 * path is already slash-normalized by the caller.
 */
export function retiredBrowseType(endpoint: string): ArchiveType | null {
  if (endpoint === "/cases" || /^\/cases\/page\/[^/]+$/.test(endpoint)) return "case";
  if (endpoint === "/courtcases") return "courtcase";
  return null;
}
