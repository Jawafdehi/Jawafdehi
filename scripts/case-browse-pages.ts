// How many pages the case browse has, asked of the same index the page itself
// queries.
//
// ⚠️ There are two plausible counts and using the wrong one writes 404s into the
// build. `/api/cases/` is the DB list and `/api/search/?type=case` is the
// OpenSearch index; `scripts/pre-render.ts` and `scripts/sitemap.ts` both had
// the full case list already, so deriving the page count from its length was the
// obvious move — and it is wrong, because `Cases.tsx` pages against the search
// count and renders NotFound for anything past it.
//
// Take the search count as 460 and the list as 463: the build writes
// `/cases/page/39/`, the component asks search for page 39, gets nothing back,
// decides it is past the end and renders NotFound. The pre-render writes that
// HTML without complaint and the sitemap advertises the URL. Measured equal
// (463/463) on 2026-10-03, so this is a latent divergence rather than a live
// fault — but the two are different systems and the index is rebuilt
// independently, so "equal today" is not a property to rely on.
//
// Pointed at the same index the reader's browser will query, the two cannot
// disagree by construction.

import { CASES_PAGE_SIZE, casesPageCount, casesPagePath } from '../src/lib/cases-pagination.ts';

const FETCH_TIMEOUT_MS = 10_000;

interface CaseSearchCount {
  count?: unknown;
}

/**
 * Every case-browse page path, page one first, sized by the live search count.
 *
 * Throws rather than guessing. A build that silently fell back to the list count
 * would reintroduce exactly the mismatch this module exists to remove, and the
 * caller is already in a context where a failed API read is fatal.
 */
export async function caseBrowsePagePaths(apiBase: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${apiBase}/search/?type=case&page_size=1`, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS}ms counting cases for the browse pages`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`API error ${res.status} counting cases for the browse pages`);
  const data = (await res.json()) as CaseSearchCount;
  if (typeof data.count !== 'number' || !Number.isFinite(data.count)) {
    throw new Error(`Case search returned no usable count (got ${JSON.stringify(data.count)})`);
  }

  const total = casesPageCount(data.count);
  return Array.from({ length: total }, (_, index) => casesPagePath(index + 1));
}

export { CASES_PAGE_SIZE };
