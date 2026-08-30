import { useEffect, useState } from "react";

/**
 * The 2/3 September 2026 public event was postponed on 29 August, after the
 * flooding in Rasuwa, Nuwakot, Dhading and Gorkha. This module replaces the
 * old `september-event.ts`, which held the facts every surface announcing the
 * event had to agree on; the surfaces are gone and only the notice is left.
 *
 * No new date is set. When one is, the announcement comes back rather than
 * this being edited into it — a postponement notice and an invitation are not
 * the same component.
 */

/**
 * When the notice stops being useful: 01:00 UTC on 3 September, which is
 * 6:45 AM in Nepal and 6:00 PM Pacific on 2 September — the moment the session
 * would have started. Nobody arriving after that is arriving for it.
 */
export const EVENT_POSTPONED_NOTICE_ENDS_AT = Date.parse("2026-09-03T01:00:00Z");

/**
 * Deterministic on the server, real on the client.
 *
 * The home route is prerendered, so evaluating the clock during render would
 * bake one answer into the static HTML and then contradict it at hydration.
 * Instead the server always renders the notice and the client hides it on
 * mount once the cutoff is past. The cost is one frame of a stale bar on the
 * first load after it; the alternative is a hydration mismatch on every load
 * before it.
 */
export function useEventPostponedNoticePast(): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    setPast(Date.now() > EVENT_POSTPONED_NOTICE_ENDS_AT);
  }, []);

  return past;
}
