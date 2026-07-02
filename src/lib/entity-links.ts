// Single source of truth for building the SPA path to an entity record page.
//
// Entity binds are keyed on the canonical NES `@id` IRI, e.g.
//   https://jawafdehi.org/entity/person/ram-shah
// The `/entity/*` route (EntityRecordProfile) reads the splat (`params["*"]`)
// and fetches `/api/entities/<prefix>/<slug>`, so the link MUST keep the
// `<prefix>/<slug>` tail as multiple path segments. Do NOT `encodeURIComponent`
// the whole IRI — that turns the `/` into `%2F`, collapsing it to one segment
// that instead matches the numeric `/entity/:id` route and fails to resolve.
const ENTITY_MARKER = "/entity/";

export function entityPath(iri: string | null | undefined): string | null {
  if (!iri) return null;
  const i = iri.indexOf(ENTITY_MARKER);
  return i === -1 ? null : `/entity/${iri.slice(i + ENTITY_MARKER.length)}`;
}
