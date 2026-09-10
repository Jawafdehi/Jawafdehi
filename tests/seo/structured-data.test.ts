import { describe, it, expect } from 'vitest';

import {
  LICENSE_URL,
  MAX_GRAPH_ENTITIES,
  ORGANIZATION_ID,
  WEBSITE_ID,
  caseStructuredData,
  entityStructuredData,
} from '../../src/utils/structured-data';

// The point of this graph is that an agent can resolve a claim to an identifier
// and a licence rather than to a page of prose. So the assertions here are about
// identity and provenance — the entity IRIs, the API record, the licence, the
// publisher — not about the presence of tags for their own sake.

const CANONICAL = 'https://jawafdehi.org/case/namuna-nagarpalika-kharid-prakaran';
const API_URL = 'https://api.jawafdehi.org/api/cases/namuna-nagarpalika-kharid-prakaran/';

// A fictional municipality: test fixtures on this repo are Nepali, but an
// invented allegation must never name a real body.
const CASE_TITLE = 'नमुना नगरपालिका खरिद प्रकरण';

function caseNode(overrides: Parameters<typeof caseStructuredData>[0] | null = null) {
  return caseStructuredData(
    overrides ?? {
      canonicalUrl: CANONICAL,
      title: CASE_TITLE,
      description: 'परीक्षण विवरण।',
      apiUrl: API_URL,
    },
  )[0];
}

describe('caseStructuredData', () => {
  it('describes the case as a Report keyed on its own canonical URL', () => {
    const node = caseNode();

    expect(node['@context']).toBe('https://schema.org');
    // Report is a subclass of Article, so Article consumers still read it while
    // the type says what the record actually is.
    expect(node['@type']).toBe('Report');
    expect(node['@id']).toBe(`${CANONICAL}#case`);
    expect(node.url).toBe(CANONICAL);
    expect(node.mainEntityOfPage).toBe(CANONICAL);
  });

  it('states the licence and the publisher on every case', () => {
    const node = caseNode();

    expect(node.license).toBe(LICENSE_URL);
    expect(node.isAccessibleForFree).toBe(true);
    expect((node.publisher as Record<string, unknown>)['@id']).toBe(ORGANIZATION_ID);
    expect((node.isPartOf as Record<string, unknown>)['@id']).toBe(WEBSITE_ID);
  });

  it('points at the JSON record so an agent reading only the graph still finds it', () => {
    const subjectOf = caseNode().subjectOf as Record<string, unknown>;

    expect(subjectOf.contentUrl).toBe(API_URL);
    expect(subjectOf.encodingFormat).toBe('application/json');
  });

  it('binds involved parties to their canonical entity IRIs, not to their names', () => {
    const node = caseNode({
      canonicalUrl: CANONICAL,
      title: CASE_TITLE,
      entities: [
        {
          display_name: 'Department of Survey, Damak',
          nes_id: 'https://jawafdehi.org/entity/deptofsurvey/department-of-survey',
          entity_type: 'AdministrativeArea',
          type: 'related',
        },
      ],
    });

    const about = node.about as Array<Record<string, unknown>>;
    expect(about).toHaveLength(1);
    // The IRI is the join key: the same value appears as this entity's own @id on
    // its page, which is what lets "which cases involve X" be answered by
    // identifier instead of by string-matching a transliterated name.
    expect(about[0]['@id']).toBe('https://jawafdehi.org/entity/deptofsurvey/department-of-survey');
    expect(about[0]['@type']).toBe('AdministrativeArea');
    expect(about[0].url).toBe('https://jawafdehi.org/entity/deptofsurvey/department-of-survey');
  });

  it('reads the schema.org class out of a comma-joined refined entity type', () => {
    const node = caseNode({
      canonicalUrl: CANONICAL,
      title: CASE_TITLE,
      entities: [
        {
          display_name: 'Some District',
          nes_id: 'https://jawafdehi.org/entity/place/some-district',
          // The API stores refinements after the class; only the class is a
          // schema.org type, and flattening this to Thing would lose it.
          entity_type: 'AdministrativeArea,jawafdehi:District',
        },
      ],
    });

    expect((node.about as Array<Record<string, unknown>>)[0]['@type']).toBe('AdministrativeArea');
  });

  it('falls back to Thing rather than emitting an invalid @type', () => {
    const node = caseNode({
      canonicalUrl: CANONICAL,
      title: CASE_TITLE,
      entities: [
        { display_name: 'Mystery party', nes_id: null, entity_type: 'jawafdehi:unmapped' },
      ],
    });

    expect((node.about as Array<Record<string, unknown>>)[0]['@type']).toBe('Thing');
  });

  it('caps the party list so a 200-entity case does not bloat every crawl', () => {
    const entities = Array.from({ length: MAX_GRAPH_ENTITIES + 40 }, (_, i) => ({
      display_name: `Party ${i}`,
      nes_id: `https://jawafdehi.org/entity/person/party-${i}`,
      entity_type: 'Person',
    }));

    const node = caseNode({ canonicalUrl: CANONICAL, title: CASE_TITLE, entities });

    // The complete list stays reachable through the JSON alternate; the head
    // carries a bounded slice.
    expect(node.about as unknown[]).toHaveLength(MAX_GRAPH_ENTITIES);
  });

  it('links an author only when they have a public profile page', () => {
    const node = caseNode({
      canonicalUrl: CANONICAL,
      title: CASE_TITLE,
      authors: [
        { display_name: 'Sambhav Koirala', slug: 'sambhav-koirala', has_public_page: true },
        { display_name: 'Unlisted Reviewer', slug: 'unlisted', has_public_page: false },
      ],
    });

    const authors = node.author as Array<Record<string, unknown>>;
    expect(authors).toHaveLength(2);
    expect(authors[0].url).toBe('https://jawafdehi.org/author/sambhav-koirala');
    expect(authors[1].url).toBeUndefined();
  });

  it('declares Nepali unless the reader is explicitly in English', () => {
    expect(caseNode({ canonicalUrl: CANONICAL, title: CASE_TITLE }).inLanguage).toBe('ne');
    expect(
      caseNode({ canonicalUrl: CANONICAL, title: CASE_TITLE, language: 'en' }).inLanguage,
    ).toBe('en');
    expect(
      caseNode({ canonicalUrl: CANONICAL, title: CASE_TITLE, language: 'ne-NP' }).inLanguage,
    ).toBe('ne');
  });

  it('omits empty fields rather than emitting nulls a parser has to skip', () => {
    const node = caseNode({ canonicalUrl: CANONICAL, title: CASE_TITLE, description: '' });

    expect('description' in node).toBe(false);
    expect('about' in node).toBe(false);
    expect('keywords' in node).toBe(false);
  });
});

describe('entityStructuredData', () => {
  const ENTITY_IRI = 'https://jawafdehi.org/entity/deptofsurvey/department-of-survey';
  const ENTITY_PAGE = 'https://jawafdehi.org/entity/deptofsurvey/department-of-survey';

  function entityGraph(input: Parameters<typeof entityStructuredData>[0]) {
    const page = entityStructuredData(input)[0];
    return { page, entity: page.mainEntity as Record<string, unknown> };
  }

  it('separates the record from the entity, because only one of them is a CreativeWork', () => {
    const { page, entity } = entityGraph({
      canonicalUrl: ENTITY_PAGE,
      iri: ENTITY_IRI,
      entityType: 'AdministrativeArea',
      name: 'Department of Survey, Damak',
    });

    // schema.org scopes inLanguage / isPartOf / license to CreativeWork, so they
    // belong to the page. Validating the graph against the vocabulary flags each
    // of them as a domain violation when they sit on a Place or a Person — and
    // "this office is licensed CC0" is the wrong claim besides.
    expect(page['@type']).toBe('WebPage');
    expect(page.license).toBe(LICENSE_URL);
    expect(page.inLanguage).toBe('ne');
    expect((page.isPartOf as Record<string, unknown>)['@id']).toBe(WEBSITE_ID);
    expect((page.publisher as Record<string, unknown>)['@id']).toBe(ORGANIZATION_ID);

    for (const creativeWorkOnly of ['license', 'inLanguage', 'isPartOf', 'isAccessibleForFree']) {
      expect(creativeWorkOnly in entity).toBe(false);
    }
  });

  it('points the page at the entity through mainEntity', () => {
    const { page, entity } = entityGraph({
      canonicalUrl: ENTITY_PAGE,
      iri: ENTITY_IRI,
      entityType: 'AdministrativeArea',
      name: 'Department of Survey, Damak',
    });

    expect(page['@id']).toBe(`${ENTITY_PAGE}#page`);
    expect(page.url).toBe(ENTITY_PAGE);
    expect(entity['@id']).toBe(ENTITY_IRI);
    expect(entity.mainEntityOfPage).toBe(ENTITY_PAGE);
  });

  it('uses the entity IRI as the node identity, not the page URL', () => {
    const { entity } = entityGraph({
      canonicalUrl: ENTITY_PAGE,
      iri: ENTITY_IRI,
      entityType: 'AdministrativeArea',
      name: 'Department of Survey, Damak',
    });

    expect(entity['@id']).toBe(ENTITY_IRI);
    expect(entity['@type']).toBe('AdministrativeArea');
  });

  it('falls back to a page-scoped id when the record carries no IRI', () => {
    const { entity } = entityGraph({ canonicalUrl: ENTITY_PAGE, name: 'Nameless' });

    expect(entity['@id']).toBe(`${ENTITY_PAGE}#entity`);
  });

  it('carries the other script as alternateName and drops duplicates', () => {
    const { entity } = entityGraph({
      canonicalUrl: ENTITY_PAGE,
      name: 'Department of Survey, Damak',
      nameAlternate: 'नापी कार्यालय, दमक',
      aliases: ['नापी कार्यालय, दमक', 'Damak Survey Office'],
    });

    expect(entity.alternateName).toEqual(['नापी कार्यालय, दमक', 'Damak Survey Office']);
  });

  it('never repeats the display name as its own alternate', () => {
    const { entity } = entityGraph({
      canonicalUrl: ENTITY_PAGE,
      name: 'Same Name',
      nameAlternate: 'Same Name',
    });

    expect('alternateName' in entity).toBe(false);
  });

  it("puts the entity's own site in url and other authorities in sameAs, never both", () => {
    const { entity } = entityGraph({
      canonicalUrl: ENTITY_PAGE,
      name: 'Department of Survey, Damak',
      officialUrl: 'https://dos.gov.np/',
      sameAs: ['https://www.wikidata.org/wiki/Q1', 'https://dos.gov.np/'],
    });

    expect(entity.url).toBe('https://dos.gov.np/');
    expect(entity.sameAs).toEqual(['https://www.wikidata.org/wiki/Q1']);
  });

  it('never lists the archive page as sameAs — that relation is mainEntityOfPage', () => {
    const { entity } = entityGraph({
      canonicalUrl: ENTITY_PAGE,
      iri: ENTITY_IRI,
      name: 'Department of Survey, Damak',
      officialUrl: 'https://dos.gov.np/',
    });

    expect(entity.sameAs).toBeUndefined();
    expect(entity.mainEntityOfPage).toBe(ENTITY_PAGE);
  });

  it('omits url entirely when the entity has no site of its own', () => {
    const { entity } = entityGraph({ canonicalUrl: ENTITY_PAGE, name: 'No Website' });

    // Better than pointing `url` at the archive page: that is what
    // `mainEntityOfPage` says, and the @id already resolves.
    expect('url' in entity).toBe(false);
  });
});
