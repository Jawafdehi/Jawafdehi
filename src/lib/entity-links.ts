// Single source of truth for building the SPA path to an entity record page.
//
// Entity binds are keyed on the canonical NES `@id` IRI, e.g.
//   https://jawafdehi.org/entity/person/ram-shah
// The `/entity/*` route (EntityRecordProfile) reads the splat (`params["*"]`)
// and fetches `/api/entities/<prefix>/<slug>`, so the link MUST keep the
// `<prefix>/<slug>` tail as multiple path segments. Do NOT `encodeURIComponent`
// the whole IRI — that collapses the `/` into `%2F` and the tail stops being a
// record path, which entityPath() now rejects outright.
//
// This module stays dependency-free on purpose: route-patterns.ts imports
// isEntityRecordTail from here for the edge's 404 decision, and the edge bundle
// must not grow a second route table to do it.
const ENTITY_MARKER = "/entity/";

// An entity record lives at its `@id` tail, which is always `<prefix>/<slug>` or
// deeper — person/ram-shah, location/country/nepal. Measured against the live
// sitemap in 2026-10: of 17,122 entity URLs, 12,901 carry two tail segments and
// the rest three to five. NOT ONE carries a single segment.
//
// 🚨 This is what makes a single-segment /entity/<x> a 404 rather than a page.
// It used to be one by accident: a numeric `/entity/:id` route sat beside the
// splat and React Router ranked it first, so the splat never saw one. That route
// was removed in 2026-10 along with the records behind it (the API 404s every
// numeric id), and without this predicate the splat would simply inherit those
// URLs and keep answering 200.
//
// Answering 200 was the whole bug: the route matched, nothing was pre-rendered
// for it, so the Worker's SPA fallback served the HOMEPAGE's pre-rendered HTML
// verbatim — homepage title, homepage body, rel=canonical on the homepage. 138
// dead URLs all claiming to be the homepage is what Search Console reported as
// "Duplicate, Google chose different canonical than user" on 2026-10-07; Google
// refused the declaration and elected an arbitrary cluster member instead.
export function isEntityRecordTail(tail: string | null | undefined): boolean {
  return (tail ?? "").split("/").filter(Boolean).length >= 2;
}

export function entityPath(iri: string | null | undefined): string | null {
  if (!iri) return null;
  const i = iri.indexOf(ENTITY_MARKER);
  if (i === -1) return null;
  const tail = iri.slice(i + ENTITY_MARKER.length);
  // A flat IRI has no page to link to. Returning null here rather than a dead
  // path keeps the sitemap, the pre-render walk and every link component
  // agreeing with the edge about which entity URLs exist — they all come
  // through this function.
  return isEntityRecordTail(tail) ? `/entity/${tail}` : null;
}
