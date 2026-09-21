import { describe, it, expect } from 'vitest';
import {
  getSubjectEntities,
  getCaseTypeLabelKey,
  getFacetItemLabel,
} from '@/utils/case-entities';
import en from '@/i18n/locales/en.json';
import ne from '@/i18n/locales/ne.json';

const role = (e: { type?: string | null }) => e.type;

describe('getSubjectEntities', () => {
  it('prefers accused entities when present', () => {
    const entities = [
      { id: 1, type: 'accused' },
      { id: 2, type: 'related' },
      { id: 3, type: 'location' },
    ];
    expect(getSubjectEntities(entities, role).map(e => e.id)).toEqual([1]);
  });

  it('returns all accused entities, not just the first', () => {
    const entities = [
      { id: 1, type: 'accused' },
      { id: 2, type: 'accused' },
    ];
    expect(getSubjectEntities(entities, role).map(e => e.id)).toEqual([1, 2]);
  });

  it('falls back to non-location entities when there is no accused', () => {
    const entities = [
      { id: 1, type: 'related' },
      { id: 2, type: 'witness' },
      { id: 3, type: 'location' },
    ];
    expect(getSubjectEntities(entities, role).map(e => e.id)).toEqual([1, 2]);
  });

  it('never returns location-only entities as a subject', () => {
    const entities = [{ id: 1, type: 'location' }];
    expect(getSubjectEntities(entities, role)).toEqual([]);
  });

  it('ignores entities with a missing/empty role in the fallback', () => {
    const entities = [
      { id: 1, type: undefined },
      { id: 2, type: '' },
      { id: 3, type: 'related' },
    ];
    expect(getSubjectEntities(entities, role).map(e => e.id)).toEqual([3]);
  });

  it('handles null/undefined entity lists', () => {
    expect(getSubjectEntities(null, role)).toEqual([]);
    expect(getSubjectEntities(undefined, role)).toEqual([]);
  });
});

describe('getCaseTypeLabelKey', () => {
  it('maps known case types', () => {
    expect(getCaseTypeLabelKey('CORRUPTION')).toBe('cases.type.corruption');
    expect(getCaseTypeLabelKey('TAX_EVASION')).toBe('cases.type.taxEvasion');
    expect(getCaseTypeLabelKey('BANKING_OFFENCE')).toBe('cases.type.bankingOffence');
  });

  it('is case-insensitive (scraped court types vary in casing)', () => {
    // "Corruption" and "CORRUPTION" must resolve to the SAME key so facets
    // don't fragment into duplicate buckets.
    expect(getCaseTypeLabelKey('Corruption')).toBe('cases.type.corruption');
    expect(getCaseTypeLabelKey('corruption')).toBe('cases.type.corruption');
  });

  it('returns null for unknown/null (never mislabels as a default)', () => {
    // Previously fell through to a corruption default — a WRIT would render as
    // "corruption". Now unknown types return null so callers humanize the raw value.
    expect(getCaseTypeLabelKey(null)).toBeNull();
    expect(getCaseTypeLabelKey(undefined)).toBeNull();
    expect(getCaseTypeLabelKey('SOMETHING_ELSE')).toBeNull();
  });
});

describe('getFacetItemLabel', () => {
  // Passthrough: return the fallback so these assertions test the labelling,
  // not the bundle. The bundle itself is checked at the bottom of this block.
  const t = (key: string, fallback?: string) => fallback ?? key;

  it('names court tiers and court identifiers through the shared helper', () => {
    expect(getFacetItemLabel('court_type', { name: 'district' }, t)).toBe(
      'District Court',
    );
    expect(getFacetItemLabel('court', { name: 'kathmandudc' }, t)).toBe(
      'Kathmandu District Court',
    );
    expect(getFacetItemLabel('court', { name: 'butwalhc' }, t)).toBe(
      'Butwal High Court',
    );
    expect(getFacetItemLabel('court', { name: 'supreme' }, t)).toBe(
      'Supreme Court',
    );
  });

  it('follows the viewer language for court names', () => {
    expect(getFacetItemLabel('court_type', { name: 'high' }, t, 'ne')).toBe(
      'उच्च अदालत',
    );
    expect(getFacetItemLabel('court', { name: 'special' }, t, 'ne')).toBe(
      'विशेष अदालत',
    );
  });

  // `NATIONAL` marks the two country-wide courts (supreme + special) — ~44% of
  // the court corpus — not a province. Title-casing it to "National" would read
  // as an eighth province, so it is labelled by what it selects instead.
  it('labels the NATIONAL province sentinel rather than title-casing it', () => {
    expect(getFacetItemLabel('province', { name: 'NATIONAL' }, t)).toBe(
      'National jurisdiction',
    );
  });

  // Districts and provinces arrive from the API as canonical title-case English
  // names, so the labeller must leave them exactly as they are — reshaping was
  // the bug, not the fix.
  it('passes real district and province names through untouched', () => {
    for (const name of ['Kathmandu', 'Bagmati', 'Sudurpashchim', 'Madhesh']) {
      expect(getFacetItemLabel('province', { name }, t)).toBe(name);
      expect(getFacetItemLabel('district', { name }, t)).toBe(name);
    }
  });

  it('still prefers a display_name when the backend sends one', () => {
    expect(
      getFacetItemLabel('tags', { name: 'ciaa', display_name: 'CIAA' }, t),
    ).toBe('CIAA');
    expect(getFacetItemLabel('tags', { name: 'public_works' }, t)).toBe(
      'public works',
    );
  });

  // Nepali-first: a key used for a label must exist in BOTH bundles, or Nepali
  // readers silently fall back to the English default.
  it('has the province sentinel label in both bundles', () => {
    expect(en.archiveSearch.filters.provinceNational).toBe(
      'National jurisdiction',
    );
    expect(ne.archiveSearch.filters.provinceNational).toBe(
      'राष्ट्रिय क्षेत्राधिकार',
    );
  });
});
