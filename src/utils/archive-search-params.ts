import { archiveSearchPageSize } from "./archive-search-window";
import { readBigoBounds } from "@/lib/bigo-range";
import { readDateBounds } from "@/lib/date-range";
import { archiveSeriesBySlug } from "@/data/archive-folders";
import { seriesScope } from "@/data/material-series";
import type { ArchiveSearchParams, ArchiveSearchSort, ArchiveSearchType } from "@/types/search";

// `sort` is deliberately NOT here. A value listed in defaultValues is stripped
// from the URL, and the default sort is no longer a constant — ArchiveSearch
// resolves an absent ?sort to `featured` while browsing and `relevance` once
// there is query text. Stripping an explicit "relevance" pick would therefore
// re-resolve it to `featured` on the next read, snapping the dropdown back and
// making that option impossible to select while browsing.
const defaultValues: Record<string, string> = {
  page: "1",
};
const validSorts = new Set([
  "relevance",
  "newest",
  "oldest",
  "title",
  "featured",
]);
const validTypes = new Set([
  "all",
  "entity",
  "material",
  "courtcase",
  "case",
]);

export function normalizeArchiveSearchParams(current: URLSearchParams) {
  const next = new URLSearchParams(current);

  const page = next.get("page");
  if (!page || !/^\d+$/.test(page) || Number(page) <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(Number(page)));
  }

  const sort = next.get("sort");
  if (!sort || sort === defaultValues.sort || !validSorts.has(sort)) {
    next.delete("sort");
  } else {
    next.set("sort", sort);
  }

  const type = next.get("type");
  // Default to "all": the unified corpus (entities + materials + court cases +
  // cases). Defaulting to a single under-populated type makes a fresh search look
  // empty even when the archive has plenty.
  if (!type || !validTypes.has(type)) {
    next.set("type", "all");
  } else {
    next.set("type", type);
  }

  // बिगो bounds (?bigo_min / ?bigo_max, inclusive, whole NPR). Only a pair the
  // API would actually accept survives: it answers a malformed bound, or a
  // bigo_min above bigo_max, with a 400 — which this page renders as the red
  // "could not be loaded" alert. A stale bookmark should degrade into a wider
  // result set, not into what reads as a search outage.
  //
  // The rules themselves live in readBigoBounds, which ArchiveSearch's request
  // builder also reads through — this rewrite lands an effect later than the
  // first request, so the two cannot be allowed to disagree.
  const bigo = readBigoBounds(next);
  setOrDelete(next, "bigo_min", bigo.min);
  setOrDelete(next, "bigo_max", bigo.max);

  // Record-date bounds (?date_from / ?date_to, Gregorian YYYY-MM-DD, inclusive),
  // on exactly the same terms as बिगो above: the API 400s a malformed date or an
  // inverted pair, and readDateBounds is the one place that rule lives.
  //
  // Dates need the calendar check too, not just the shape — "2026-02-31" passes
  // any regex and is still a 400.
  const dates = readDateBounds(next);
  setOrDelete(next, "date_from", dates.from);
  setOrDelete(next, "date_to", dates.to);

  return next;
}

// `String(0)` is "0", so a legitimate zero lower bound survives — the test is
// `undefined`, not falsiness, exactly as it is on the API side.
function setOrDelete(
  params: URLSearchParams,
  name: string,
  value: number | string | undefined,
) {
  if (value === undefined) params.delete(name);
  else params.set(name, String(value));
}

export function setArchiveSearchParam(
  current: URLSearchParams,
  name: string,
  value?: string | number,
) {
  const next = new URLSearchParams(current);
  const stringValue = value === undefined ? "" : String(value);

  if (!stringValue || defaultValues[name] === stringValue) {
    next.delete(name);
  } else {
    next.set(name, stringValue);
  }

  return normalizeArchiveSearchParams(next);
}

export function toggleArchiveSearchParam(
  current: URLSearchParams,
  name: string,
  value: string,
  multiple = true,
) {
  const next = new URLSearchParams(current);

  if (!multiple) {
    if (next.get(name) === value) next.delete(name);
    else next.set(name, value);
  } else {
    const selected = new Set(next.getAll(name));
    if (selected.has(value)) selected.delete(value);
    else selected.add(value);

    next.delete(name);
    selected.forEach((item) => next.append(name, item));
  }

  next.delete("page");
  return normalizeArchiveSearchParams(next);
}

// ─── Reading a search's parameters from its URL ─────────────────────────────
//
// Moved here from ArchiveSearch.tsx so the edge renderer can build the SAME
// query key the page reads (entry-server prefetches ["archive-search", params]).
// Two copies of this would be two keys, and a key the page does not read is a
// prefetch nobody consumes — the shape of the 2026-11-20 blank-case-page outage.

// The page size and the API's offset window live in archive-search-window.ts,
// a module with NO imports, so the Worker can read them too (see there).
export { archiveSearchMaxOffsetResults, archiveSearchPageSize } from "./archive-search-window";

/** The tabs whose records carry a district and province. */
export function hasSubjectGeography(type: ArchiveSearchType) {
  return type === "courtcase" || type === "case" || type === "entity";
}

export function readRecordType(searchParams: URLSearchParams): ArchiveSearchType {
  const requestedType = searchParams.get("type");
  return ["all", "entity", "material", "courtcase", "case", "series"].includes(
    requestedType || "",
  )
    ? (requestedType as ArchiveSearchType)
    : "all";
}

// The URL's बिगो bounds under the API's own param names.
function readBigoParams(searchParams: URLSearchParams) {
  const { min, max } = readBigoBounds(searchParams);
  return { bigo_min: min, bigo_max: max };
}

// The URL's date bounds. Already the API's param names, so this only applies the
// rules — but it stays a named helper so the readParams spread reads the same as
// the बिगो one above.
function readDateParams(searchParams: URLSearchParams) {
  const { from, to } = readDateBounds(searchParams);
  return { date_from: from, date_to: to };
}

function readSeriesScope(searchParams: URLSearchParams) {
  const series = archiveSeriesBySlug(searchParams.get("series") ?? "");
  if (series) return seriesScope(series);
  // ?source=<key>: one whole source from /api/document-sources/ (JAW-65), for
  // the sources no curated series covers.
  const source = searchParams.get("source");
  return source ? { source: [source] } : {};
}

export function readParams(
  searchParams: URLSearchParams,
  selectedRecordType: ArchiveSearchType,
): ArchiveSearchParams {
  const requestedSort = searchParams.get("sort") as ArchiveSearchSort | null;
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const q = searchParams.get("q") || undefined;
  return {
    q,
    type: selectedRecordType === "all" ? undefined : selectedRecordType,
    // Only honour entity_type while browsing Entities. A hand-edited or
    // bookmarked URL can still carry it into another record type, where the
    // facet is hidden and the filter would drop results with no visible cause.
    entity_type:
      selectedRecordType === "entity"
        ? searchParams.getAll("entity_type")
        : [],
    // These dimensions describe court records, not ordinary Jawafdehi cases.
    // Ignore stale hand-authored/bookmarked values on other tabs so the result
    // set can never be narrowed by a control the reader cannot see.
    court:
      selectedRecordType === "courtcase" ? searchParams.getAll("court") : [],
    court_type:
      selectedRecordType === "courtcase"
        ? searchParams.getAll("court_type")
        : [],
    // District and Province carry SUBJECT geography, which court cases,
    // Jawafdehi cases and entities all populate, so they apply on exactly the
    // tabs that show the control (filterGroupsFor). Reading them only on Court
    // cases ignored a ticked province on the Cases tab while the control showed
    // it as applied.
    district: hasSubjectGeography(selectedRecordType)
      ? searchParams.getAll("district")
      : [],
    province: hasSubjectGeography(selectedRecordType)
      ? searchParams.getAll("province")
      : [],
    // Document type is material-scoped and CLOSED on the API side, so a stale
    // token is not merely a filter through an invisible control — it is a 400,
    // which this page renders as the red "could not be loaded" alert. Gating it
    // here means switching tabs cannot turn a bookmark into what reads as an
    // outage. (updateRecordType also strips it from the URL; this is the guard
    // for a hand-authored one that never went through a tab switch.)
    material_type:
      selectedRecordType === "material"
        ? searchParams.getAll("material_type")
        : [],
    // A series (?series=<slug>) is a SCOPE, the landing page's folders opened
    // as a filter: its source token and document kind, built by seriesScope.
    // Documents only, and an unknown slug scopes nothing rather than erroring.
    ...(selectedRecordType === "material" ? readSeriesScope(searchParams) : {}),
    // A series carries none of these facets, so the series tab sends none: a
    // stale value would empty it through a control it does not show.
    case_type: selectedRecordType === "series" ? [] : searchParams.getAll("case_type"),
    tags: selectedRecordType === "series" ? [] : searchParams.getAll("tags"),
    // Cases-only, gated like court_type: a value carried onto another tab would
    // narrow it through a control that tab does not show.
    case_origin: selectedRecordType === "case" ? searchParams.getAll("case_origin") : [],
    case_stage: selectedRecordType === "case" ? searchParams.getAll("case_stage") : [],
    // Date bounds, gated to the tab that renders the control. Read through
    // readDateParams for the same reason as the बिगो pair below: an inverted
    // range parses fine bound-by-bound, and normalization only heals the URL an
    // effect later — by which point this render has already sent the 400.
    ...(selectedRecordType === "material"
      ? readDateParams(searchParams)
      : { date_from: undefined, date_to: undefined }),
    // Only honour the बिगो bounds while browsing Cases. No other record type
    // carries an amount, so a bound left over from a case view would empty the
    // results of whatever the reader switched to — with the control that set it
    // no longer on screen. Same gate, and the same reason, as entity_type above.
    //
    // Read through readBigoBounds, NOT by parsing each bound here: an inverted
    // pair parses fine bound-by-bound, and normalizeArchiveSearchParams only
    // repairs the URL an effect later — by which point this render has already
    // sent `bigo_min > bigo_max` and taken a 400.
    ...(selectedRecordType === "case"
      ? readBigoParams(searchParams)
      : { bigo_min: undefined, bigo_max: undefined }),
    // An explicit ?sort wins. Otherwise the default depends on whether there is
    // query text: with none, EVERY document scores identically (a constant 2.0),
    // so `relevance` degenerates to the `iri` tiebreaker and browse order comes
    // out alphabetical by slug — which is why `bara-hulak-…` used to lead.
    // Browsing with no query shows the most recent first; the editorial weight
    // ("featured") is the home page's order, still one pick away in Sort. A
    // typed query has real scores, so it sorts by relevance.
    sort: requestedSort && validSorts.has(requestedSort)
      ? requestedSort
      : q
        ? "relevance"
        : "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: archiveSearchPageSize,
    // The /cases browse (Cases tab, no query text): a case series shows as ONE
    // card in place of its member cases. A typed query keeps the members
    // findable one by one, so search never collapses; the API applies it only
    // to a case-only browse anyway.
    collapse_series: selectedRecordType === "case" && !q ? true : undefined,
  };
}
