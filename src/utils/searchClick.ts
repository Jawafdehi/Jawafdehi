/**
 * Search result-click beacon.
 *
 * Fire-and-forget POST to /api/search/click recording that a search result was
 * clicked, join-keyed by the response's `search_id` to the query that produced
 * it. Together with the server-side `search_query` log this closes the loop into
 * (query → shown → clicked) judgments for future relevance tuning.
 *
 * Deliberately NOT consent-gated — unlike the GA4 `select_search_result` event
 * (which only fires when gtag is loaded, i.e. after consent). The beacon carries
 * NO identity, sets no cookies, and is the unbiased ground-truth denominator the
 * ~24%-consented GA sample cannot provide. It is still suppressed on
 * dev/localhost/preview hosts (`telemetryAllowedHere`) so throwaway traffic never
 * pollutes production analytics.
 *
 * Transport is `navigator.sendBeacon`: it survives the click-then-navigate unload
 * and posts `text/plain` (a CORS-safelisted content type → no preflight), which
 * the endpoint parses from the raw body. Any failure is swallowed — a beacon must
 * never affect the click or navigation.
 */

import { telemetryAllowedHere } from "@/lib/telemetry";
import { API_BASE_URL } from "@/services/http";
import type { ArchiveSearchResult } from "@/types/search";

export interface SearchClickBeacon {
  searchId: string | undefined;
  rank: number;
  result: Pick<ArchiveSearchResult, "type" | "id" | "score">;
}

export function sendSearchClick({
  searchId,
  rank,
  result,
}: SearchClickBeacon): void {
  // No search_id (older cached response / mock) → nothing to join to.
  if (!searchId) return;
  // Dev/localhost/preview: never beacon (mirrors GA/Sentry host gating).
  if (!telemetryAllowedHere()) return;
  if (
    typeof navigator === "undefined" ||
    typeof navigator.sendBeacon !== "function"
  ) {
    return;
  }

  const payload = JSON.stringify({
    search_id: searchId,
    rank,
    result_type: result.type,
    result_id: result.id,
    result_score: result.score,
  });

  try {
    navigator.sendBeacon(`${API_BASE_URL}/api/search/click`, payload);
  } catch {
    // Best-effort: a beacon failure must never affect the click/navigation.
  }
}
