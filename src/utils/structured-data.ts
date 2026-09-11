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
 * How many bound parties a case graph carries. The rest stay on the JSON alternate.
 *
 * Measured on the real 194-party record from the live API, gzipped as the edge
 * serves it:
 *
 *   parties |  head raw | head gzip
 *         0 |     7,688 |     1,497
 *         5 |     8,718 |     1,718
 *        10 |     9,708 |     1,919
 *        20 |    11,402 |     2,187
 *
 * So a party costs ~34 gzip bytes, and carrying all 194 would add roughly 6 KB
 * gzip — to a head that is fetched on EVERY crawl of that page, forever, to
 * duplicate a list the `rel=alternate` JSON already serves complete. Twenty keeps
 * the whole graph at ~1.2 KB gzip while still naming the parties an agent is most
 * likely to be resolving.
 *
 * If you raise this, re-measure rather than estimating: the cost is per party and
 * the tail of a big case is long.
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

/**
 * The Open Graph type for an entity page.
 *
 * Open Graph's `profile` means specifically A PERSON — it exists to carry
 * `profile:first_name`, `profile:last_name`, `profile:username` and
 * `profile:gender`. Most entities in this archive are not people: they are
 * ministries, survey offices, courts, districts and municipalities. Declaring
 * `og:type=profile` for a district tells every unfurler to look for a person's
 * given name and find nothing.
 *
 * So `profile` is reserved for an actual Person, and everything else gets the
 * generic `website`. (`article` would be wrong in the other direction: an entity
 * record is not a piece of writing with a publication date.)
 */
export function entityOgType(entityType: string | null | undefined): "profile" | "website" {
  return schemaType(entityType, "Thing") === "Person" ? "profile" : "website";
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

/**
 * Keep only the plain objects in a list that is supposed to hold records.
 *
 * These lists come straight off the API, and a `null` in `entities[]` — or a bare
 * string, or a nested array — used to reach a property access and throw. At the
 * edge that is not a bad node in the graph, it is an uncaught exception in the
 * Worker, so ONE malformed row would answer 500 for the whole page. A row we
 * cannot read is dropped instead.
 */
function records<T>(value: T[] | undefined): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is T => typeof item === "object" && item !== null && !Array.isArray(item),
  );
}

/** Only a string survives into the graph; anything else is treated as absent. */
function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
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
  const about = records(input.entities)
    .slice(0, MAX_GRAPH_ENTITIES)
    .map((entity) =>
      pruned({
        "@type": schemaType(text(entity.entity_type), "Thing"),
        "@id": text(entity.nes_id),
        name: text(entity.display_name),
        url: entityUrlFromIri(text(entity.nes_id)) ?? undefined,
      }),
    )
    .filter((node) => Boolean(node.name || node["@id"]));

  const authors = records(input.authors)
    .map((author) =>
      pruned({
        "@type": "Person",
        name: text(author.display_name),
        url:
          author.has_public_page && text(author.slug)
            ? `${SITE_URL}/author/${author.slug}`
            : undefined,
      }),
    )
    .filter((node) => Boolean(node.name));

  // Tags arrive from the API and have been seen as a bare string; anything that is
  // not a list of non-empty strings is dropped rather than stringified into junk
  // keywords.
  const keywords = Array.isArray(input.tags)
    ? input.tags.map((tag) => text(tag)).filter((tag): tag is string => Boolean(tag))
    : [];

  return [
    pruned({
      "@context": SCHEMA_CONTEXT,
      "@type": "Report",
      "@id": `${input.canonicalUrl}#case`,
      url: input.canonicalUrl,
      // Both, on purpose: `headline` is what article consumers read, `name` is
      // what generic CreativeWork consumers read, and a case has one title.
      // Measured on the real record: carrying both costs 339 raw bytes and SIX
      // bytes gzipped, because the second copy is a back-reference away. Not worth
      // dropping, and this note exists so nobody spends a review cycle on it.
      headline: input.title,
      name: input.title,
      description: input.description || undefined,
      inLanguage: languageTag(input.language),
      datePublished: text(input.datePublished),
      dateModified: text(input.dateModified),
      image: text(input.imageUrl),
      // The case type as the archive classifies it (BRIBERY, TAX_EVASION, …).
      // `genre` is the schema.org slot for a work's category.
      genre: text(input.caseType),
      keywords: keywords.length ? keywords : undefined,
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
 * The graph for an entity page: TWO nodes, deliberately.
 *
 * The entity is a Person, an Organization or a Place — NOT a CreativeWork. So
 * `inLanguage`, `isPartOf` and `license` cannot sit on it: schema.org scopes all
 * three to CreativeWork, and a validation run against the vocabulary flags each
 * as a domain violation. It is also a category error to read aloud — "this
 * official is licensed CC0" — because the licence covers the archive's RECORD
 * about the entity, not the entity.
 *
 * So the record gets its own node. A WebPage carries the page-level facts
 * (language, licence, which site it belongs to) and points at the entity through
 * `mainEntity`; the entity node carries only what is true of the entity itself.
 * That is also the pattern an agent can rely on: `mainEntity` is the documented
 * way to ask "what is this page actually about".
 *
 * WebPage rather than the more specific ProfilePage: ProfilePage would say a
 * little more, but Google evaluates it as a rich-result feature with recommended
 * fields (dateCreated, interactionStatistic) an archive record has no business
 * inventing, and it reads oddly over a Place. WebPage is correct for every entity
 * type this archive holds.
 *
 * The entity node's @id is the entity's own IRI rather than the page URL, which is
 * the whole point: two agents that each read a different case both get the same
 * identifier for the same official, and can join on it.
 */
export function entityStructuredData(
  input: EntityStructuredDataInput,
): Array<Record<string, unknown>> {
  const alternateNames = [input.nameAlternate, ...(input.aliases ?? [])]
    .map((value) => text(value)?.trim())
    .filter((value): value is string => Boolean(value) && value !== input.name);

  // The entity's own site is `url`; other authorities' pages for it are `sameAs`
  // (Wikidata, a ministry register). That split is the convention consumers
  // expect, and it stops the official site being stated twice.
  //
  // The archive's own page is deliberately in neither — that relation is
  // `mainEntityOfPage`, and listing our page as `sameAs` would assert the archive
  // is another authority on the entity rather than a document about it.
  const officialUrl = text(input.officialUrl)?.trim();
  const sameAs = [
    ...new Set(
      (Array.isArray(input.sameAs) ? input.sameAs : [])
        .map((value) => text(value)?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].filter((value) => value !== officialUrl);

  const entityNode = pruned({
    "@type": schemaType(input.entityType, "Thing"),
    "@id": input.iri || `${input.canonicalUrl}#entity`,
    name: input.name,
    alternateName: alternateNames.length ? [...new Set(alternateNames)] : undefined,
    description: input.description || undefined,
    image: input.imageUrl || undefined,
    url: officialUrl,
    sameAs: sameAs.length ? sameAs : undefined,
    mainEntityOfPage: input.canonicalUrl,
    subjectOf: input.apiUrl
      ? { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: input.apiUrl }
      : undefined,
  });

  return [
    pruned({
      "@context": SCHEMA_CONTEXT,
      "@type": "WebPage",
      "@id": `${input.canonicalUrl}#page`,
      url: input.canonicalUrl,
      name: input.name,
      description: input.description || undefined,
      inLanguage: languageTag(input.language),
      isPartOf: websiteRefNode(),
      license: LICENSE_URL,
      isAccessibleForFree: true,
      publisher: organizationNode(),
      mainEntity: entityNode,
    }),
  ];
}
