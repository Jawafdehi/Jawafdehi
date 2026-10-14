/**
 * The head a material page shows — in ONE place, because two renderers produce it.
 *
 * `MaterialProfile.tsx` renders it with Helmet once React has hydrated. `worker.ts`
 * injects it at the edge for a client that never runs JS. Materials are not
 * pre-rendered — there are 346,250 of them against Cloudflare's ceiling of 20,000
 * static asset files per Worker version — so for a crawler the edge copy is the
 * ONLY head that exists, and the two must not be allowed to drift. Same arrangement
 * as `caseMetaDescription` in `src/utils/seo.ts`, for the same reason.
 *
 * Deliberately free of React, axios and the datalake client: `worker.ts` pulls this
 * module into the edge bundle, and anything imported here is imported there.
 */

// Relative, not the `@/` alias, and deliberately so: every module reachable from
// worker.ts uses relative specifiers, because the edge bundle is built by wrangler
// rather than by vite and does not get vite's alias config. CI never bundles the
// Worker, so an unresolvable specifier here would surface at deploy time.
import { humanizeEntityType } from "../utils/entity-helpers";
import { SITE_URL, stripHtml, truncateMeta } from "../utils/seo";

/** A schema.org language map, or a plain string for a single-language value. */
export type MaterialTextValue =
  | { en?: string | null; ne?: string | null }
  | string
  | null
  | undefined;

/**
 * The slice of a material record the head is built from.
 *
 * Structural rather than imported from `services/datalake-api`: importing the
 * `Material` interface from there would pull the axios client into the edge bundle
 * along with it.
 */
export interface MaterialMetaSource {
  "@id"?: string;
  "@type"?: string | string[];
  additionalType?: string;
  name?: MaterialTextValue;
  description?: MaterialTextValue;
  datePublished?: unknown;
  identifier?: unknown;
  /** `LISTED` | `UNLISTED` — see `materialRobots`. Absent on older API builds. */
  "jawafdehi:visibility"?: unknown;
}

/**
 * The `robots` value for a material, or `null` to leave it indexable.
 *
 * `GET /api/materials/<iri>/` resolves LISTED **and** UNLISTED to anonymous
 * callers, by design — `materials/models.py` defines UNLISTED as "reachable by
 * direct IRI, but NOT searchable / NOT in sitemaps", the YouTube-unlisted
 * semantics an IN_REVIEW case's documents inherit. Serving those a full indexable
 * head would publish in-review editorial work to search engines.
 *
 * `handleCaseMetaFallback` has gated this since it was written (`state ===
 * 'PUBLISHED' ? null : 'noindex, nofollow'`); materials simply had no fallback to
 * gate, and adding one without this would have been a regression rather than a
 * gap.
 *
 * ⚠️ FAILS CLOSED, deliberately. Anything that is not explicitly `LISTED` —
 * including the field being absent, which is what every API build before the
 * companion change returns — is treated as not indexable. The cost of failing
 * closed is that material pages are noindex until that change deploys; the cost of
 * failing open is publishing in-review documents, and only one of those is
 * reversible. Open Graph is unaffected either way, so share cards work throughout.
 */
export function materialRobots(
  data: MaterialMetaSource | null | undefined,
): string | null {
  return data?.["jawafdehi:visibility"] === "LISTED" ? null : "noindex, nofollow";
}

/** English preferred, Nepali as the fallback — both sides kept for the caller. */
export function materialBilingual(v: MaterialTextValue): {
  en: string;
  ne: string;
} {
  if (!v) return { en: "", ne: "" };
  if (typeof v === "string") return { en: v, ne: "" };
  return { en: v.en || "", ne: v.ne || "" };
}

/** Comma-joined `@type` + `additionalType`, the form `humanizeEntityType` reads. */
export function materialTypeToken(
  t: MaterialMetaSource["@type"],
  additional?: string,
): string | undefined {
  const parts: string[] = [];
  if (Array.isArray(t)) parts.push(...t);
  else if (t) parts.push(t);
  if (additional) parts.push(additional);
  return parts.length ? parts.join(",") : undefined;
}

/** Last IRI segment, humanized — a fallback title when no name is present. */
export function materialIriLabel(iri: string | undefined): string {
  if (!iri) return "";
  const tail = iri.split("/").filter(Boolean).pop() || iri;
  return tail.replace(/[-_]/g, " ").trim() || tail;
}

/**
 * Percent-encode each path segment of a material tail, preserving the separators.
 *
 * A tail is `<source>/<ident>` and idents are not always URL-safe — Devanagari and
 * already-percent-encoded upstream filenames both occur. Encoding the whole string
 * would eat the `/` that separates source from ident.
 *
 * ⚠️ This does NOT make an arbitrary tail safe to interpolate into a URL, because
 * `encodeURIComponent("..")` is `".."` — dots are unreserved. Call `isMaterialTail`
 * first; see the note there for what that costs if you skip it.
 */
export function encodeMaterialTail(tail: string): string {
  return tail.split("/").map(encodeURIComponent).join("/");
}

/**
 * Is this splat a material tail worth resolving at all?
 *
 * `/material/*` matches at any depth, so the splat is attacker-controlled. Without
 * this check `/material/..%2Fcases%2F<slug>` decodes to `../cases/<slug>`, survives
 * `encodeMaterialTail` (dots are unreserved), and `fetch` then NORMALISES
 * `…/api/materials/../cases/<slug>/` to `…/api/cases/<slug>/` — so the edge renders
 * an unrelated record's title into the head and advertises
 * `canonical=…/material/../cases/<slug>`. Verified against the deployed preview on
 * 2026-10-14: HTTP 200, with the case's slug as the title.
 *
 * That is an unbounded family of indexable junk URLs on our own origin, reachable
 * by anyone, so this is a gate rather than a sanitiser: anything that is not plainly
 * `<source>/<ident>` is not a material and gets a 404.
 *
 * Two segments is the minimum rather than the exact count: a material IRI is
 * `/material/<source>/<ident>` and idents are upstream keys that may themselves
 * contain a slash.
 */
export function isMaterialTail(tail: string): boolean {
  const segments = tail.split("/");
  if (segments.length < 2) return false;
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

/** The title shown, in order of preference: name → IRI tail → the URL tail. */
export function materialDisplayName(
  data: MaterialMetaSource | null | undefined,
  tail: string,
): string {
  const name = materialBilingual(data?.name);
  return (
    name.en ||
    name.ne ||
    materialIriLabel(data?.["@id"]) ||
    tail.split("/").pop() ||
    "Material"
  );
}

export function materialTypeLabel(
  data: MaterialMetaSource | null | undefined,
): string {
  return humanizeEntityType(
    data ? materialTypeToken(data["@type"], data.additionalType) : undefined,
  );
}

export function materialMetaTitle(displayName: string): string {
  return `${displayName} | Jawafdehi governance archive`;
}

/**
 * The record's own description, stripped of markup and NOT truncated.
 *
 * This is what JSON-LD carries and what the page body renders. `""` when the
 * record has none — callers decide what to say instead.
 */
export function materialDescriptionText(
  data: MaterialMetaSource | null | undefined,
): string {
  const description = materialBilingual(data?.description);
  return stripHtml(description.en || description.ne);
}

/**
 * The `<meta name="description">`.
 *
 * Truncated, unlike `materialDescriptionText`: a material's stored description is
 * frequently the document's whole abstract, and a multi-kilobyte meta description
 * is cut by search engines at an arbitrary point anyway.
 *
 * The fallback names the document and its type rather than saying anything
 * site-wide. That matters more than it looks — the site-wide sentence is exactly
 * what made all 346,250 material URLs read as copies of the homepage.
 */
export function materialMetaDescription(
  data: MaterialMetaSource | null | undefined,
  displayName: string,
  typeLabel: string,
): string {
  const text = materialDescriptionText(data);
  if (text) return truncateMeta(text);
  return truncateMeta(
    `${displayName} — ${typeLabel} in the Jawafdehi governance archive.`,
  );
}

/**
 * The canonical URL, with NO trailing slash.
 *
 * Material pages are not pre-rendered, so nothing is published at
 * `/material/<tail>/index.html` and the slashless form answers 200 directly — the
 * opposite of a case page, whose pre-rendered file makes the slashless form 307.
 * The API's own sitemap emits the slashless form too, so this agrees with it.
 */
export function materialCanonicalUrl(tail: string): string {
  return `${SITE_URL}/material/${encodeMaterialTail(tail)}`;
}

/**
 * schema.org JSON-LD for crawlers, safe to embed in a `<script>` element.
 *
 * `<` is escaped as `<` HERE rather than at each call site, because both
 * callers embed the result in a script element and only one of them was doing it.
 * A `<script>` element's content is raw text, so a `</script>` anywhere inside
 * ends it — and `name` reaches this verbatim (unlike `description`, which callers
 * pass through `materialDescriptionText`/`stripHtml` first).
 *
 * `<` is valid JSON and parses back to `<`, so the structured data a crawler
 * reads is unchanged.
 */
export function materialJsonLd(
  data: MaterialMetaSource,
  displayName: string,
  description: string,
): string {
  const name = materialBilingual(data.name);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: displayName,
    url: data["@id"],
    identifier: data.identifier ?? undefined,
    // Which language the title above is actually IN, which is not the same as
    // "does this record have a Nepali name". The old test was `name.ne ? "ne"
    // : "en"`, so a bilingual record was labelled Nepali while `displayName`
    // had already preferred its English name — mislabelling the one string this
    // node exposes. Mirror materialDisplayName's preference instead.
    inLanguage: name.en ? "en" : name.ne ? "ne" : "en",
    isAccessibleForFree: true,
    ...(description ? { description } : {}),
    ...(data.datePublished
      ? { datePublished: String(data.datePublished) }
      : {}),
    publisher: { "@type": "Organization", name: "Jawafdehi" },
  }).replace(/</g, "\\u003c");
}
