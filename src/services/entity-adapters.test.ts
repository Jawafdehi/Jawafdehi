import { describe, it, expect } from 'vitest';
import { jsonLdToEntity } from './entity-adapters';
import { getPrimaryName } from '@/utils/entity-helpers';

// Regression: the v2 API serves entities as schema.org JSON-LD ({ name: {en, ne} }), but the SPA
// reads entity.names[]. Before the adapter, getPrimaryName(entity.names) threw
// "Cannot read properties of undefined (reading 'find')" and crashed every case page.
describe('jsonLdToEntity', () => {
  const person = {
    '@id': 'https://jawafdehi.org/entity/person/bharat-acharya-214985',
    '@type': 'Person',
    '@context': 'https://schema.org',
    name: { en: 'Bharat Acharya', ne: 'भरत आचार्य' },
    dateCreated: '2024-01-02T00:00:00Z',
  };

  it('maps the JSON-LD name object into a PRIMARY names[] entry', () => {
    const e = jsonLdToEntity(person);
    expect(e.names).toHaveLength(1);
    expect(e.names[0].kind).toBe('PRIMARY');
    expect(e.names[0].en?.full).toBe('Bharat Acharya');
    expect(e.names[0].ne?.full).toBe('भरत आचार्य');
  });

  it('feeds getPrimaryName without throwing (the original crash)', () => {
    const e = jsonLdToEntity(person);
    expect(() => getPrimaryName(e.names, 'en')).not.toThrow();
    expect(getPrimaryName(e.names, 'en')).toBe('Bharat Acharya');
    expect(getPrimaryName(e.names, 'ne')).toBe('भरत आचार्य');
  });

  it('derives type from the IRI path', () => {
    expect(jsonLdToEntity(person).type).toBe('person');
    expect(
      jsonLdToEntity({ '@id': 'https://jawafdehi.org/entity/location/singha-durbar-1', '@type': 'Place', name: { en: 'Singha Durbar' } }).type,
    ).toBe('location');
    expect(
      jsonLdToEntity({ '@id': 'https://jawafdehi.org/entity/organization/x-1', '@type': 'GovernmentOrganization', name: { en: 'X' } }).type,
    ).toBe('organization');
  });

  it('exposes empty collections so array-iterating consumers never see undefined', () => {
    const e = jsonLdToEntity(person);
    expect(e.pictures).toEqual([]);
    expect(e.contacts).toEqual([]);
    expect(() => e.pictures?.find(() => true)).not.toThrow();
  });

  it('tolerates a missing/empty name and a bare-string name', () => {
    expect(jsonLdToEntity({ '@id': 'https://jawafdehi.org/entity/person/x' }).names).toEqual([]);
    const s = jsonLdToEntity({ '@id': 'https://jawafdehi.org/entity/person/y', name: 'Plain Name' });
    expect(s.names[0].en?.full).toBe('Plain Name');
  });

  it('does not throw on null/garbage input', () => {
    expect(() => jsonLdToEntity(null)).not.toThrow();
    expect(jsonLdToEntity(null).names).toEqual([]);
  });
});
