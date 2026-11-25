// SPDX-License-Identifier: Hippocratic-3.0
// The search page's page size and the API's offset window.
//
// ⚠️ NO IMPORTS, and keep it that way. worker/edge-listing.ts reads these to
// decide which listing pages the edge renders, and every module reachable from
// worker.ts is bundled by wrangler, which does not know vite's `@/` alias. CI
// never bundles the Worker, so an aliased import anywhere in this file's
// dependency tree would pass every test and fail at deploy. They live here,
// apart from archive-search-params.ts (which imports through `@/`), for exactly
// that reason.

export const archiveSearchPageSize = 12;

// Mirrors MAX_OFFSET_RESULT_WINDOW in the API's search/service.py. Offset paging
// (?page=) is rejected with HTTP 400 once `page * page_size` passes this, because
// OpenSearch will not serve a `from + size` beyond its max_result_window — so the
// reachable page count is bounded by THIS, not by the result count.
//
// At page_size 12 that is page 833, while `count` (578k+ records) implies 48,185.
// The pager used to offer the implied last page and every click on it 400'd.
//
// Raising the API's window means raising this too — they are one constant in two
// repos, and the FE cannot discover the server's value (it is not in the search
// response envelope). If deep paging is ever genuinely needed, the response's
// `next_cursor` is the unbounded path; it is next-only, so it cannot back a
// numbered pager and would need a different affordance.
export const archiveSearchMaxOffsetResults = 10_000;
