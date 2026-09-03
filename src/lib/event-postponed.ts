import { useSyncExternalStore } from "react";

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
 * The cutoff cannot move while a tab is open, so there is nothing to subscribe
 * to. `useSyncExternalStore` still wants a subscribe function, and an
 * unsubscribe that does nothing is the honest implementation of "this value
 * never changes underneath you".
 */
const subscribe = () => () => {};

/**
 * Deterministic on the server, real on the client.
 *
 * The home route is prerendered, so evaluating the clock during render would
 * bake one answer into the static HTML and then contradict it at hydration.
 * `useSyncExternalStore` is the hook built for exactly that split: React reads
 * `getServerSnapshot` while hydrating, then reconciles against the client
 * snapshot as part of the same commit.
 *
 * This deliberately is NOT `useState` + `useEffect`. Effects run after paint,
 * so that shape renders the notice, lets the browser paint it, and only then
 * removes it — a visible frame of a stale bar on every hard load past the
 * cutoff, for every visitor, indefinitely. It was invisible while the strip was
 * navy on the navy home hero and became a full-width amber flash the moment it
 * was recoloured for contrast, which is how it was found.
 */
export function useEventPostponedNoticePast(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Date.now() > EVENT_POSTPONED_NOTICE_ENDS_AT,
    () => false,
  );
}
