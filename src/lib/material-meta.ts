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
  /**
   * `LISTED` | `UNLISTED` — the material's public-reachability state.
   *
   * ⚠️ Staff-only, and NOT what decides indexability. `materials/views.py`
   * (`_with_admin_visibility`) attaches this for authed caseworker/readonly
   * reads so the editor can drive the policy control; "public reads never see
   * these fields", deliberately, because the policy itself says which documents
   * are gated. Kept on this interface because a staff reader's payload really
   * does carry it — never read it to decide what a crawler may index.
   */
  "jawafdehi:visibility"?: unknown;
  /** `true` when search engines may index this document — see `materialRobots`. */
  "jawafdehi:indexable"?: unknown;
}

/**
 * The `robots` value for a material, or `null` to leave it indexable.
 *
 * ⚠️ FAILS CLOSED, deliberately: anything that is not explicitly indexable —
 * including the field being absent — is `noindex, nofollow`. Failing open would
 * publish in-review editorial work, and worse (see below); only one direction of
 * this mistake is reversible.
 *
 * ## Why this no longer keys on `jawafdehi:visibility`
 *
 * It used to read `visibility === "LISTED"`, and said so in a note promising the
 * pages were "noindex until that change deploys". That change could never
 * deploy. `jawafdehi:visibility` is attached by `_with_admin_visibility` in
 * `materials/views.py` **only for authed caseworker/readonly reads** — "public
 * reads never see these fields", because the visibility policy itself tells you
 * which documents are gated. The edge renderer authenticates as `sa-prerender`,
 * whose "single role maps to a Django group with no permissions, so it sees
 * exactly what an anonymous reader sees" (`worker/api-token.ts`). So the field
 * was never going to arrive, the guard could never open, and every document
 * page served `noindex` — while the API's sitemap generator listed every one
 * of them as public. Measured 2026-11-23, when the sitemap held 372,995 of them:
 * 18 of 18 sampled pages across `ag`, `bolpatra` and `nkp`.
 *
 * ## Why indexability is its own field, not a view of visibility
 *
 * They answer different questions. `visibility` is "may the public reach this
 * document", and for this archive the answer is usually yes — that is the point
 * of publishing it. Indexability is "should we push this into Google", which is
 * an editorial judgement the archive has to make document-class by document-class.
 *
 * It is not a hypothetical distinction. Measured against the search API on
 * 2026-11-23 (fuzzy matching, so upper bounds): ~21,746 documents mention
 * `परिवर्तित नाम` — the court-ordered identity protection used for complainants
 * in sexual-offence and trafficking cases — and ~5,079 mention `जबरजस्ती करणी`.
 * Their titles carry the protected complainant and the **named defendant**
 * together. Those documents are legitimately public records and are legitimately
 * in our archive; optimising them so that searching a person's name returns a
 * rape charge sheet is a separate act, and not one a `LISTED` flag should be
 * able to authorise by itself.
 *
 * ## The contract with the API
 *
 * `jawafdehi:indexable` is a public boolean that ONLY the API may emit. It is
 * meant to be computed as LISTED **and** the document's class cleared for
 * indexing, and it leaks nothing the `robots` tag does not already say.
 *
 * Two halves, and they are not equally done:
 *
 * - **Ownership** — enforced. The API reserves the key on write and strips any
 *   stored value from every read, detail and list, anon and staff
 *   (`materials/patch_validation.py`, `SERVER_OWNED_READ_KEYS`). That matters
 *   because this function trusts the value outright: if a stored document could
 *   carry `"jawafdehi:indexable": true` through to a read — and ingest, moves and
 *   backfills all write storage without passing the API's HTTP write checks —
 *   one bad row would make its page indexable.
 * - **Computation** — not yet built. Until it is, no read carries the key and
 *   every document page stays `noindex`. Which document classes get cleared is
 *   an editorial decision for the organisation, not a code default.
 *
 * Open Graph is unaffected either way, so share cards keep working throughout.
 */
export function materialRobots(
  data: MaterialMetaSource | null | undefined,
): string | null {
  return data?.["jawafdehi:indexable"] === true ? null : "noindex, nofollow";
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

/** The composed share card's intrinsic size; the API renders exactly this. */
export const MATERIAL_CARD_WIDTH = 1200;
export const MATERIAL_CARD_HEIGHT = 630;

/**
 * The document's own share card: what kind of document it is, its title, and
 * "Find more documents in the archive". Rendered by the platform API
 * (`materials/og_card.py`) and proxied by the Worker under THIS origin, exactly
 * as the author card is (see `authorCardUrl`). Both renderers of a material's
 * head — MaterialProfile and the Worker — take it from here, so a crawler and a
 * browser cannot disagree about the page's image.
 */
export function materialCardUrl(tail: string): string {
  return `${SITE_URL}/assets/og/material/${encodeMaterialTail(tail)}.jpg`;
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
