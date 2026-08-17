import { useEffect, useState } from "react";

/**
 * The 2 September 2026 public event — one place for the facts every surface
 * that announces it has to agree on.
 *
 * The event straddles two days and two calendars, which is the whole reason
 * this lives in one module. In the US it is the evening of Wednesday
 * 2 September (BS 2083-05-17, भदौ १७); in Nepal it is the morning of Thursday
 * 3 September (BS 2083-05-18, भदौ १८). Both verified with the platform's
 * `convert_date`.
 *
 * The copy therefore never puts a BS date on a US clock time. Doing so is how
 * you end up publishing a bare भदौ १७, which reads to a Nepal-side attendee as
 * "be there on the 17th" and sends them a day early. BS appears only on the
 * Nepal line; the US line stays on the Gregorian date the diaspora actually
 * lives by. Every date string is authored per locale rather than derived, so
 * neither one can be recomputed into the other by accident.
 */

/** Registration. A Cloudflare redirect out to the Zoom page — not an SPA route. */
export const SEPTEMBER_EVENT_URL = "https://jawafdehi.org/september-2";

/** Shown next to the button so the URL on the flyer and the QR code is legible on screen too. */
export const SEPTEMBER_EVENT_URL_LABEL = "jawafdehi.org/september-2";

/**
 * The flyer, as served from `public/`.
 *
 * The card is capped at 260 CSS px, so it ships as a 260w file with a 520w
 * companion behind `srcset`: a 1x screen pays 16 KB and only retina pays 41.
 * The 1200w render is a click-through, never fetched with the page.
 */
export const SEPTEMBER_EVENT_FLYER = "/assets/events/september-2-flyer.webp";
export const SEPTEMBER_EVENT_FLYER_CARD = "/assets/events/september-2-flyer-card.webp";
export const SEPTEMBER_EVENT_FLYER_CARD_2X = "/assets/events/september-2-flyer-card@2x.webp";

/**
 * When the announcement stops being an announcement: 6:00 PM Pacific plus the
 * 1.5 hour run time = 02:30 UTC on 3 September.
 */
export const SEPTEMBER_EVENT_ENDS_AT = Date.parse("2026-09-03T02:30:00Z");

/**
 * Deterministic on the server, real on the client.
 *
 * The home route is prerendered, so evaluating the clock during render would
 * bake one answer into the static HTML and then contradict it at hydration.
 * Instead the server always renders the announcement and the client hides it on
 * mount once the event is past. The cost is one frame of a stale banner on the
 * first load after the event; the alternative is a hydration mismatch on every
 * load before it.
 */
export function useSeptemberEventPast(): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    setPast(Date.now() > SEPTEMBER_EVENT_ENDS_AT);
  }, []);

  return past;
}
