import { useSyncExternalStore } from "react";

/**
 * The 23/24 September 2026 public launch — one place for the facts every
 * surface announcing it has to agree on.
 *
 * This replaces `event-postponed.ts`, which replaced `september-event.ts`. The
 * 2/3 September session was postponed on 29 August after the flooding in
 * Rasuwa, Nuwakot, Dhading and Gorkha; this is the new date, and the
 * postponement notice it supersedes had already expired.
 *
 * The session straddles two days and two calendars, which is the whole reason
 * this lives in one module. In the US it is the evening of Wednesday
 * 23 September; in Nepal it is the morning of Thursday 24 September
 * (BS 2083-06-08, आश्विन ८), verified with the platform's `convert_date`.
 *
 * Both locales therefore carry BOTH dates, and each leads with its own. A
 * Nepali reader who sees a bare "23 September" joins twenty-four hours early,
 * which is the exact failure the two-date rule exists to prevent. Every date
 * string is authored per locale rather than derived, so neither can be
 * recomputed into the other by accident.
 *
 * The copy says *public launch*, never "launches" or "goes live". 80+ cases
 * are already published and the site's own case history says so; copy that
 * implies day one is contradicted by the thing it is advertising.
 */

/**
 * Registration. A Cloudflare redirect out to the Zoom page, answered at the
 * edge — not an SPA route, and not a page GA4 can ever see.
 *
 * Because the request never reaches our origin, attribution is done with one
 * slug per source rather than a query parameter (`?source=` provably cannot
 * work here: the Zoom target ends in a `#/registration` fragment and Cloudflare
 * appends the query after it, so it lands inside the fragment and no server is
 * ever told about it). The rule matches on `starts_with()`, so a new code needs
 * no Terraform change and a mistyped one still redirects.
 *
 * Off-site channels use a single hyphen (`-fb`, `-ig`, `-qr`, …). This one uses
 * a double hyphen to mark it a placement on our own website, so the report
 * separates "someone was already on jawafdehi.org" from "a channel sent them".
 * The registry of codes is management/events/2026-09-23-jawafdehi-launch/
 * link-tracking.md in the meta repo.
 */
export const LAUNCH_EVENT_URL_BAR = "https://jawafdehi.org/launch--banner";

/**
 * When the announcement stops being an announcement: 6:00 PM Pacific on
 * 23 September plus the 1.5 hour run time = 02:30 UTC on 24 September.
 *
 * 23 September is inside US daylight time (UTC-7), so 6:00 PM Pacific is
 * 01:00 UTC on the 24th — which is 6:45 AM in Nepal (UTC+05:45) the same
 * morning. That single instant is why the two date strings name different days.
 */
export const LAUNCH_EVENT_ENDS_AT = Date.parse("2026-09-24T02:30:00Z");

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
 * so that shape renders the bar, lets the browser paint it, and only then
 * removes it — a visible frame of a stale bar on every hard load past the
 * cutoff. The notice this replaces was rewritten onto this hook for exactly
 * that reason once it was recoloured amber and the flash became visible.
 *
 * What the hook cannot fix is the prerendered HTML, which always contains the
 * bar. The notice this replaces sat expired in it from 3 September onward,
 * telling crawlers the event was off nine days after that stopped being the
 * useful thing to say. Hiding is not deleting: someone has to take this
 * component out after the 24th.
 */
export function useLaunchEventPast(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Date.now() > LAUNCH_EVENT_ENDS_AT,
    () => false,
  );
}
