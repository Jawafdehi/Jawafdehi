import { gzipSync } from 'node:zlib';

import { describe, it, expect } from 'vitest';

import { buildHeadTags, renderHeadTagsToHtml } from '../../src/utils/seo';
import { caseHeadInput, entityHeadInput } from '../../src/utils/record-head';
import { MAX_GRAPH_ENTITIES } from '../../src/utils/structured-data';

// A page's <head> is paid for on every request and every crawl, forever, and
// structured data is the easiest thing on a site to let grow without noticing —
// each individually reasonable field lands on a document nobody re-measures.
// scripts/bundle-budget.mjs does this job for the JS payload; this does it for the
// head.
//
// The numbers are gzipped, because that is how the edge serves HTML, and measured
// against a worst-case case record (194 bound parties, Devanagari title) rather
// than a tidy one. The limits carry deliberate headroom: they are here to catch a
// field that doubles the head, not to argue about fifty bytes.

const gzipBytes = (value: string) => gzipSync(Buffer.from(value), { level: 9 }).length;

function headFor(input: Parameters<typeof buildHeadTags>[0]): string {
  return renderHeadTagsToHtml(buildHeadTags(input));
}

/** A worst-case case: 194 parties, a long Devanagari title, every field populated. */
function worstCaseRecord() {
  return {
    title: 'दमक बालुवाटार जग्गा प्रकरण: रु. ४१.६२ करोडको सरकारी जग्गा व्यक्तिका नाममा दर्ता',
    slug: 'damak-baluwatar-land-fraud',
    state: 'PUBLISHED',
    case_type: 'CORRUPTION',
    description:
      'नापी कार्यालयका कर्मचारीहरूको मिलेमतोमा सरकारी जग्गा व्यक्तिका नाममा दर्ता गरिएको आरोपमा मुद्दा दायर।'.repeat(4),
    key_allegations: ['सरकारी जग्गा व्यक्तिका नाममा दर्ता', 'कागजात नक्कली बनाएको'],
    tags: ['land', 'survey', 'corruption', 'damak'],
    created_at: '2026-07-01T00:00:00Z',
    case_publish_date: '2026-07-22',
    updated_at: '2026-07-23T10:00:00Z',
    entities: Array.from({ length: 194 }, (_, i) => ({
      display_name: `Party Number ${i} With A Reasonably Long Name`,
      nes_id: `https://jawafdehi.org/entity/person/party-number-${i}-with-a-long-slug`,
      entity_type: i % 3 === 0 ? 'Person' : 'AdministrativeArea,jawafdehi:District',
      type: 'accused',
    })),
    authors: [
      { display_name: 'Sambhav Koirala', slug: 'sambhav-koirala', has_public_page: true },
      { display_name: 'Second Author', slug: 'second-author', has_public_page: true },
    ],
  };
}

function entityRecord() {
  return {
    '@id': 'https://jawafdehi.org/entity/deptofsurvey/department-of-survey',
    '@type': 'AdministrativeArea,jawafdehi:District',
    name: { en: 'Department of Survey, Damak', ne: 'नापी कार्यालय, दमक' },
    description: { en: 'The office holding survey records for the Damak area.'.repeat(3) },
    alternateName: { en: ['Damak Survey Office'], ne: ['नापी कार्यालय'] },
    url: 'https://example.invalid/',
    sameAs: 'https://www.wikidata.org/wiki/Q1',
  };
}

// Measured on the worst case at the time of writing, plus headroom. Re-measure and
// justify in the commit if you move these; do not nudge them to make a build pass.
const CASE_HEAD_GZIP_LIMIT = 2_600;
const ENTITY_HEAD_GZIP_LIMIT = 1_200;

describe('the head stays within a measured budget', () => {
  it('for a worst-case case page', () => {
    const head = headFor(caseHeadInput(worstCaseRecord(), 'damak-baluwatar-land-fraud'));

    expect(gzipBytes(head)).toBeLessThan(CASE_HEAD_GZIP_LIMIT);
  });

  it('for an entity page', () => {
    const head = headFor(entityHeadInput(entityRecord(), ['deptofsurvey', 'department-of-survey']));

    expect(gzipBytes(head)).toBeLessThan(ENTITY_HEAD_GZIP_LIMIT);
  });

  it('caps the party list, which is what keeps the case head bounded', () => {
    const record = worstCaseRecord();
    const graph = (
      caseHeadInput(record, 'damak-baluwatar-land-fraud').jsonLd as Array<Record<string, unknown>>
    )[0];

    // 194 parties in, MAX_GRAPH_ENTITIES out. At ~34 gzip bytes each, carrying them
    // all would add roughly 6 KB gzip to every crawl of this page.
    expect((record.entities as unknown[]).length).toBe(194);
    expect((graph.about as unknown[]).length).toBe(MAX_GRAPH_ENTITIES);
  });

  it('grows with the party list rather than being accidentally constant', () => {
    // If this ever stops holding, the cap is not doing what the budget assumes and
    // the numbers above are measuring the wrong thing.
    const few = headFor(
      caseHeadInput({ ...worstCaseRecord(), entities: worstCaseRecord().entities.slice(0, 5) }, 's'),
    );
    const many = headFor(caseHeadInput(worstCaseRecord(), 's'));

    expect(gzipBytes(many)).toBeGreaterThan(gzipBytes(few));
  });

  it('spends almost nothing on the alternate links', () => {
    const input = caseHeadInput(worstCaseRecord(), 'damak-baluwatar-land-fraud');
    const withAlternates = gzipBytes(headFor(input));
    const without = gzipBytes(headFor({ ...input, alternates: undefined }));

    // Measured at ~104 gzip bytes for both links. They are the cheapest part of
    // this whole change and the most useful thing in it for an agent.
    expect(withAlternates - without).toBeLessThan(300);
  });
});
