import { describe, it, expect } from 'vitest';
import { getSubjectEntities, getCaseTypeLabelKey } from '@/utils/case-entities';

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
