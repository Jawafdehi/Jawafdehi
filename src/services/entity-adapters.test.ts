import { describe, it, expect } from 'vitest';
import { caseBindToEntity, jsonLdToEntity } from './entity-adapters';
import type { JawafEntity } from '@/types/jds';
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

  describe('image mapping -> pictures[]', () => {
    const withImage = (image: unknown) =>
      jsonLdToEntity({ '@id': 'https://jawafdehi.org/entity/organization/sebon', name: { en: 'SEBON' }, image });

    it('maps a schema.org image URL string to a single full picture', () => {
      const e = withImage('https://s3.jawafdehi.org/entities/sebon.png');
      expect(e.pictures).toEqual([{ type: 'full', url: 'https://s3.jawafdehi.org/entities/sebon.png' }]);
    });

    it('reads an ImageObject via url or contentUrl', () => {
      expect(withImage({ '@type': 'ImageObject', url: 'https://x/u.png' }).pictures).toEqual([
        { type: 'full', url: 'https://x/u.png' },
      ]);
      expect(withImage({ contentUrl: 'https://x/c.png' }).pictures).toEqual([
        { type: 'full', url: 'https://x/c.png' },
      ]);
    });

    it('maps an array of images, skipping blanks', () => {
      const e = withImage(['https://x/a.png', '  ', { url: 'https://x/b.png' }]);
      expect(e.pictures).toEqual([
        { type: 'full', url: 'https://x/a.png' },
        { type: 'full', url: 'https://x/b.png' },
      ]);
    });

    it('is [] for absent, blank, or unusable image so the type-icon fallback stands', () => {
      expect(withImage(undefined).pictures).toEqual([]);
      expect(withImage('   ').pictures).toEqual([]);
      expect(withImage({}).pictures).toEqual([]);
      expect(withImage(42).pictures).toEqual([]);
    });
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

  it('provides a type-valid version_summary placeholder', () => {
    const e = jsonLdToEntity(person);
    expect(e.version_summary.type).toBe('ENTITY');
    expect(e.version_summary.version_number).toBe(0);
    expect(e.version_summary.author.id).toBe('');
  });

  describe('description mapping -> LangText { value }', () => {
    it('maps a plain schema.org string description', () => {
      const e = jsonLdToEntity({ ...person, description: 'A short bio' });
      expect(e.description?.en?.value).toBe('A short bio');
    });
    it('maps an { en, ne } string object description', () => {
      const e = jsonLdToEntity({ ...person, description: { en: 'bio', ne: 'परिचय' } });
      expect(e.description?.en?.value).toBe('bio');
      expect(e.description?.ne?.value).toBe('परिचय');
    });
    it('passes through an already-nested { en: { value } } description', () => {
      const e = jsonLdToEntity({ ...person, description: { en: { value: 'nested' } } });
      expect(e.description?.en?.value).toBe('nested');
    });
    it('is null when absent', () => {
      expect(jsonLdToEntity(person).description).toBeNull();
    });
  });
});

// The case detail payload now carries each party's name/image, so the page builds
// its entity records from the binds instead of fetching one per party. These pin
// the mapping, and in particular the cases that must yield null — returning a
// hollow Entity there would paint an empty name where the fallback belongs.
describe('caseBindToEntity', () => {
  const bind = (over: Partial<JawafEntity> = {}): JawafEntity => ({
    nes_id: 'https://jawafdehi.org/entity/person/ram-prasad-gautam',
    display_name: 'Ram Prasad Gautam',
    entity_type: 'Person',
    type: 'accused',
    outcome: null,
    notes: '',
    name: { en: 'Ram Prasad Gautam', ne: 'राम प्रसाद गौतम' },
    image: null,
    ...over,
  });

  it('maps both scripts into names[] the way the cards read them', () => {
    const e = caseBindToEntity(bind())!;
    expect(getPrimaryName(e.names, 'en')).toBe('Ram Prasad Gautam');
    expect(getPrimaryName(e.names, 'ne')).toBe('राम प्रसाद गौतम');
  });

  it('keeps the one script it has', () => {
    const e = caseBindToEntity(bind({ name: { en: null, ne: 'राम प्रसाद गौतम' } }))!;
    expect(getPrimaryName(e.names, 'ne')).toBe('राम प्रसाद गौतम');
    expect(getPrimaryName(e.names, 'en')).toBe('');
  });

  it('surfaces an image as pictures[], which is what the avatar reads', () => {
    const e = caseBindToEntity(bind({ image: 'https://s3.jawafdehi.org/ram.jpg' }))!;
    expect(e.pictures[0]?.url).toBe('https://s3.jawafdehi.org/ram.jpg');
  });

  it('types the entity from its IRI, not only the bind type', () => {
    const e = caseBindToEntity(
      bind({ nes_id: 'https://jawafdehi.org/entity/organization/ciaa', entity_type: 'GovernmentOrganization' }),
    )!;
    expect(e.type).toBe('organization');
  });

  it('is null for a bind with no identity — the list payload omits these fields', () => {
    expect(caseBindToEntity(bind({ name: undefined, image: undefined }))).toBeNull();
  });

  it('is null for a merged-away party, which the API sends as all-null identity', () => {
    // The backend gates name/image on the entity still being live, so a retired
    // party arrives like this and must keep falling back to display_name and the
    // kind glyph — exactly what it did when its fetch 404'd.
    expect(caseBindToEntity(bind({ name: { en: null, ne: null }, image: null }))).toBeNull();
  });

  it('is null without an id, since the record would have nothing to key on', () => {
    expect(caseBindToEntity(bind({ nes_id: null }))).toBeNull();
  });

  it('still maps when only an image survives', () => {
    const e = caseBindToEntity(
      bind({ name: { en: null, ne: null }, image: 'https://s3.jawafdehi.org/ram.jpg' }),
    )!;
    expect(e.pictures[0]?.url).toBe('https://s3.jawafdehi.org/ram.jpg');
    expect(getPrimaryName(e.names, 'en')).toBe('');
  });
});
