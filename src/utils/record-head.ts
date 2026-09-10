// One record in, one head out — shared by the app and the edge.
//
// Why this module exists at all: a case page's head is built twice, once by
// pages/CaseDetail.tsx for client-side navigation and once by worker.ts for the
// crawler (case pages are not pre-rendered, so the edge copy is the only one a
// machine reads). buildHeadTags already shared the tag LIST. It did not share the
// step before it — turning an API record into the input — and those two hand-written
// mappings had already drifted:
//
//   • The edge fell back to a real sentence when a case had no description and no
//     allegations; the page emitted an empty `description` meta.
//   • The page did not encode the slug into the canonical URL; the edge did.
//   • The page built its `rel=alternate` href from API_BASE_URL, which in production
//     resolves to the SITE origin — so it advertised
//     https://jawafdehi.org/api/cases/<slug>/, a path nothing serves. The edge
//     pointed at the real API host.
//   • Allegations were truncated at a different point in each.
//
// This is the same class of bug that made og:locale say ne_NP in the pages and
// en_US at the edge across 20 pages, which is what buildHeadTags was introduced to
// end. Sharing the tag list but not the mapping only moved the seam. Now there is
// one function, so the two heads cannot disagree without a test failing.

import {
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_URL,
  previewImageUrl,
  stripHtml,
  truncateMeta,
  type AlternateLink,
  type HeadTagInput,
} from "./seo";
import { stripMarkdown } from "./markdown";
import { caseStructuredData, entityOgType, entityStructuredData } from "./structured-data";

/**
 * The PUBLIC API origin, which is what a `rel=alternate` href has to be.
 *
 * Deliberately not `API_BASE_URL` from services/http: that one resolves to
 * same-origin in production and to a local monolith in development, because it is
 * for the app's own calls. An alternate link is metadata published to third
 * parties — it has to name the host that actually answers, from anywhere.
 */
export const PUBLIC_API_BASE = "https://api.jawafdehi.org/api";

/**
 * Uploaded media (case banners and thumbnails, CMS images) is served from the
 * portal origin, so a relative media path must resolve against it and not the
 * frontend, or shared links get broken Open Graph images.
 */
export const MEDIA_BASE = "https://portal.jawafdehi.org";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The first `limit` allegations as one sentence-joined string. */
function allegationSummary(value: unknown, limit = 2): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => text(item).trim())
    .filter(Boolean)
    .slice(0, limit)
    .join(". ");
}

export interface CaseHeadOptions {
  /** The reader's active language, for the og:locale pair and `inLanguage`. Omit
   *  at the edge, where the Nepali-first default is what a crawler should see. */
  language?: string;
}

/**
 * The complete head input for a case page, from the API record.
 *
 * `slugFromUrl` is the slug the request carried; the record's own slug wins when it
 * has one, because a case can be renamed and the old URL stays in circulation.
 */
export function caseHeadInput(
  record: Record<string, unknown>,
  slugFromUrl: string,
  options: CaseHeadOptions = {},
): HeadTagInput {
  const title = text(record.title) || "Jawafdehi Case";
  const description = truncateMeta(
    stripMarkdown(stripHtml(text(record.description))) ||
      allegationSummary(record.key_allegations) ||
      `A verified corruption and misconduct case documented by ${SITE_NAME}.`,
  );

  const slug = text(record.slug).trim() || slugFromUrl;
  const canonicalUrl = `${SITE_URL}/case/${encodeURIComponent(slug)}`;
  const apiUrl = `${PUBLIC_API_BASE}/cases/${encodeURIComponent(slug)}/`;

  const imageUrl =
    previewImageUrl(text(record.banner_url), MEDIA_BASE) ||
    previewImageUrl(text(record.thumbnail_url), MEDIA_BASE) ||
    SOCIAL_IMAGE_URL;

  const tags = Array.isArray(record.tags)
    ? record.tags.map((tag) => text(tag)).filter(Boolean)
    : [];

  const alternates: AlternateLink[] = [
    { href: apiUrl, type: "application/json", title: "Case data (JSON API)" },
    {
      href: `${SITE_URL}/oembed/?url=${encodeURIComponent(canonicalUrl)}&format=json`,
      type: "application/json+oembed",
      title: `${title} oEmbed`,
    },
  ];

  return {
    title: `${title} | Jawafdehi`,
    description,
    canonicalUrl,
    type: "article",
    imageUrl,
    imageAlt: title,
    language: options.language,
    publishedTime: text(record.created_at) || null,
    modifiedTime: text(record.updated_at) || null,
    tags,
    // Non-PUBLISHED cases are "unlisted": reachable by direct slug but kept out of
    // search engines, because they are provisional, pre-publication records.
    robots: text(record.state) === "PUBLISHED" ? null : "noindex, nofollow",
    alternates,
    jsonLd: caseStructuredData({
      canonicalUrl,
      title,
      description,
      imageUrl,
      // The publish date the archive assigns is the real one; created_at is a row
      // timestamp and can predate publication by months.
      datePublished: text(record.case_publish_date) || text(record.created_at) || null,
      dateModified: text(record.updated_at) || null,
      language: options.language,
      tags,
      entities: Array.isArray(record.entities)
        ? (record.entities as Array<Record<string, unknown>>).map((entity) => ({
            display_name: text(entity?.display_name) || null,
            nes_id: text(entity?.nes_id) || null,
            entity_type: text(entity?.entity_type) || null,
            type: text(entity?.type) || null,
          }))
        : undefined,
      authors: Array.isArray(record.authors)
        ? (record.authors as Array<Record<string, unknown>>).map((author) => ({
            display_name: text(author?.display_name) || null,
            slug: text(author?.slug) || null,
            has_public_page: author?.has_public_page === true,
          }))
        : undefined,
      apiUrl,
      caseType: text(record.case_type) || null,
    }),
  };
}

type Bilingual = { en: string | null; ne: string | null };

/** A NES bilingual field, which arrives as a language map or a bare string. */
export function bilingual(value: unknown): Bilingual {
  if (typeof value === "string") return { en: value, ne: value };
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    return { en: text(map.en) || null, ne: text(map.ne) || null };
  }
  return { en: null, ne: null };
}

/** NES stores alternateName as a language map of arrays, an array, or a string. */
export function aliasList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .map((item) => text(item))
      .filter(Boolean);
  }
  return [];
}

/** The schema.org class token off a record, tolerating an array or a refinement. */
export function entityTypeToken(record: Record<string, unknown>): string | null {
  const raw = record["@type"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return text(record.additionalType) || null;
}

export interface EntityHeadOptions {
  language?: string;
}

/**
 * The complete head input for an entity page, from the NES record.
 *
 * `segments` is the already-validated IRI tail, so this never has to decide what a
 * safe path looks like — see entityTailSegments in worker.ts.
 */
export function entityHeadInput(
  record: Record<string, unknown>,
  segments: string[],
  options: EntityHeadOptions = {},
): HeadTagInput {
  const encodedTail = segments.map(encodeURIComponent).join("/");
  const canonicalUrl = `${SITE_URL}/entity/${encodedTail}`;
  const apiUrl = `${PUBLIC_API_BASE}/entities/${encodedTail}`;

  const name = bilingual(record.name);
  // English-first, matching what the entity page itself displays, so the edge head
  // and the head the app renders on client-side navigation agree.
  const displayName = (name.en || name.ne || segments[segments.length - 1] || "Entity").trim();
  const nameAlternate = name.en && name.en !== displayName ? name.en : name.ne;
  const description = bilingual(record.description);
  const typeToken = entityTypeToken(record);

  const metaDescription = truncateMeta(
    stripHtml(description.en || description.ne || "") ||
      `${displayName} in the ${SITE_NAME} public entity registry — every documented case, allegation and record involving this entity.`,
  );

  const imageUrl =
    previewImageUrl(text(record.image) || text(record.logo), MEDIA_BASE) || SOCIAL_IMAGE_URL;

  return {
    title: `${displayName} | Jawafdehi Entity Registry`,
    description: metaDescription,
    canonicalUrl,
    // `profile` is Open Graph's type for a PERSON; most entities here are offices,
    // courts and districts. See entityOgType.
    type: entityOgType(typeToken),
    imageUrl,
    imageAlt: displayName,
    language: options.language,
    alternates: [{ href: apiUrl, type: "application/json", title: "Entity record (JSON-LD)" }],
    jsonLd: entityStructuredData({
      canonicalUrl,
      iri: text(record["@id"]) || null,
      entityType: typeToken,
      name: displayName,
      nameAlternate,
      aliases: aliasList(record.alternateName),
      description: metaDescription,
      imageUrl: imageUrl === SOCIAL_IMAGE_URL ? null : imageUrl,
      officialUrl: text(record.url) || null,
      sameAs: aliasList(record.sameAs),
      apiUrl,
      language: options.language,
    }),
  };
}
