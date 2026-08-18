import { readBigoBounds } from "@/lib/bigo-bands";

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

  return next;
}

// `String(0)` is "0", so a legitimate zero lower bound survives — the test is
// `undefined`, not falsiness, exactly as it is on the API side.
function setOrDelete(
  params: URLSearchParams,
  name: string,
  value: number | undefined,
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
