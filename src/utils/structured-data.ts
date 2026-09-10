// schema.org JSON-LD for the two page types an agent is most likely to land on:
// a case and an entity.
//
// Why this lives in utils, importable by the edge:
//
// Case pages are NOT pre-rendered — deliberately, see the long note in
// scripts/pre-render.ts. In production a case URL is served as the SPA shell
// with worker.ts swapping the head, so anything emitted only inside the React
// tree is invisible to every crawler and every agent. These builders are
// therefore plain data functions with no React and no dependencies, called from
// both the page (for in-app navigation, and for any route that IS pre-rendered)
// and from the Worker (the copy a machine actually reads).
//
// Everything here is additive metadata. Nothing in it is a source of truth: the
// authoritative record is the JSON API, which each page also advertises through
// <link rel="alternate">.

import { SITE_NAME, SITE_NAME_NEPALI, SITE_URL } from "./seo";

const SCHEMA_CONTEXT = "https://schema.org";

/** The archive is public-domain data. Stated in machine-readable form so a reuser
 *  does not have to infer it from prose on /about. */
export const LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/";

/** Stable @id for the publisher node, so every page's graph points at one
 *  organisation rather than repeating an anonymous copy. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
/** Stable @id for the site node — the `isPartOf` target for every record. */
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * A case can bind close to 200 entities. Emitting all of them would add tens of
 * kilobytes to a head that is fetched on every crawl, so the graph carries the
 * most significant slice and the JSON API alternate carries the complete list.
 * An agent that needs every party follows the alternate link.
 */
export const MAX_GRAPH_ENTITIES = 20;

export function organizationNode(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_NEPALI,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
  };
}

export function websiteRefNode(): Record<string, unknown> {
  return { "@type": "WebSite", "@id": WEBSITE_ID, name: SITE_NAME, url: `${SITE_URL}/` };
}

// A schema.org class name, as the API stores it on a bind. The field is a
// comma-joined list whose first token is the schema.org class and whose tail may
// hold prefixed refinements — `AdministrativeArea,jawafdehi:District` — so only
// the first token is considered, and only when it looks like a class. That keeps
// a prefixed or free-text value from producing an invalid @type, without
// flattening every refined entity to `Thing`.
function schemaType(value: string | null | undefined, fallback: string): string {
  const first = (value ?? "").split(",")[0].trim();
  return /^[A-Z][A-Za-z]*$/.test(first) ? first : fallback;
}

// BCP-47 tag for the reader's language. The archive is Nepali-first, so an
// absent or unrecognised value is Nepali rather than English.
function languageTag(language: string | undefined): string {
  return language && !language.startsWith("ne") ? "en" : "ne";
}

/** The SPA path for an entity IRI — the same mapping as lib/entity-links, kept
 *  independent so this module stays importable from the edge bundle. */
function entityUrlFromIri(iri: string | null | undefined): string | null {
  if (!iri) return null;
  const marker = "/entity/";
  const index = iri.indexOf(marker);
  return index === -1 ? null : `${SITE_URL}/entity/${iri.slice(index + marker.length)}`;
}

function pruned(node: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

export interface CaseEntityInput {
  display_name?: string | null;
  nes_id?: string | null;
  entity_type?: string | null;
  /** "accused" | "related" | … — the bind's role, not a schema.org value. */
  type?: string | null;
}

export interface CaseAuthorInput {
  display_name?: string | null;
  slug?: string | null;
  has_public_page?: boolean;
}

export interface CaseStructuredDataInput {
  canonicalUrl: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  language?: string;
  tags?: string[];
  entities?: CaseEntityInput[];
  authors?: CaseAuthorInput[];
  /** The JSON API record for this case — the authoritative source. */
  apiUrl?: string | null;
  caseType?: string | null;
}

/**
 * The graph for a case page.
 *
 * `Report` rather than `Article`: it is a schema.org subclass of Article, so
 * every consumer that understands Article still reads it, and it says what the
 * record is — a documented case file, not commentary.
 *
 * `about` is what makes this worth emitting at all: it binds the case to the
 * canonical entity IRIs, so an agent can resolve "which cases involve this
 * official" through identifiers instead of string-matching names across scripts.
 */
export function caseStructuredData(
  input: CaseStructuredDataInput,
): Array<Record<string, unknown>> {
  const about = (input.entities ?? [])
    .slice(0, MAX_GRAPH_ENTITIES)
    .map((entity) =>
      pruned({
        "@type": schemaType(entity.entity_type, "Thing"),
        "@id": entity.nes_id ?? undefined,
        name: entity.display_name ?? undefined,
        url: entityUrlFromIri(entity.nes_id) ?? undefined,
      }),
    )
    .filter((node) => Boolean(node.name || node["@id"]));

  const authors = (input.authors ?? [])
    .map((author) =>
      pruned({
        "@type": "Person",
        name: author.display_name ?? undefined,
        url:
          author.has_public_page && author.slug ? `${SITE_URL}/author/${author.slug}` : undefined,
      }),
    )
    .filter((node) => Boolean(node.name));

  return [
    pruned({
      "@context": SCHEMA_CONTEXT,
      "@type": "Report",
      "@id": `${input.canonicalUrl}#case`,
      url: input.canonicalUrl,
      // Both, on purpose: `headline` is what article consumers read, `name` is
      // what generic CreativeWork consumers read, and a case has one title.
      headline: input.title,
      name: input.title,
      description: input.description || undefined,
      inLanguage: languageTag(input.language),
      datePublished: input.datePublished || undefined,
      dateModified: input.dateModified || undefined,
      image: input.imageUrl || undefined,
      // The case type as the archive classifies it (BRIBERY, TAX_EVASION, …).
      // `genre` is the schema.org slot for a work's category.
      genre: input.caseType || undefined,
      keywords: input.tags?.length ? input.tags : undefined,
      about: about.length ? about : undefined,
      author: authors.length ? authors : undefined,
      publisher: organizationNode(),
      isPartOf: websiteRefNode(),
      license: LICENSE_URL,
      isAccessibleForFree: true,
      mainEntityOfPage: input.canonicalUrl,
      // Where the machine-readable original lives, in the graph as well as in the
      // <link rel="alternate"> — an agent reading only the JSON-LD still finds it.
      subjectOf: input.apiUrl
        ? { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: input.apiUrl }
        : undefined,
    }),
  ];
}

export interface EntityStructuredDataInput {
  canonicalUrl: string;
  /** The canonical NES `@id` IRI. Becomes the node's @id when present, so the
   *  same entity is one node across every page that mentions it. */
  iri?: string | null;
  /** schema.org class from the record (`Person`, `GovernmentOrganization`, …). */
  entityType?: string | null;
  name: string;
  /** The name in the other script, for `alternateName`. */
  nameAlternate?: string | null;
  aliases?: string[];
  description?: string;
  imageUrl?: string | null;
  /** The entity's own official website, if the record has one. */
  officialUrl?: string | null;
  /** Other authorities' identifiers for the same entity. */
  sameAs?: string[];
  apiUrl?: string | null;
  language?: string;
}

/**
 * The graph for an entity page.
 *
 * The @id is the entity's own IRI rather than the page URL, which is the whole
 * point: two agents that each read a different case both get the same identifier
 * for the same official, and can join on it.
 */
export function entityStructuredData(
  input: EntityStructuredDataInput,
): Array<Record<string, unknown>> {
  const alternateNames = [input.nameAlternate, ...(input.aliases ?? [])]
    .map((value) => (value ?? "").trim())
    .filter((value) => value && value !== input.name);

  const sameAs = [input.officialUrl, ...(input.sameAs ?? [])]
    .map((value) => (value ?? "").trim())
    .filter(Boolean);

  return [
    pruned({
      "@context": SCHEMA_CONTEXT,
      "@type": schemaType(input.entityType, "Thing"),
      "@id": input.iri || `${input.canonicalUrl}#entity`,
      name: input.name,
      alternateName: alternateNames.length ? [...new Set(alternateNames)] : undefined,
      description: input.description || undefined,
      image: input.imageUrl || undefined,
      // The archive's page about this entity, distinct from `sameAs`, which is
      // for the entity's own and other authorities' pages.
      mainEntityOfPage: input.canonicalUrl,
      url: input.canonicalUrl,
      sameAs: sameAs.length ? [...new Set(sameAs)] : undefined,
      inLanguage: languageTag(input.language),
      isPartOf: websiteRefNode(),
      license: LICENSE_URL,
      subjectOf: input.apiUrl
        ? { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: input.apiUrl }
        : undefined,
    }),
  ];
}
