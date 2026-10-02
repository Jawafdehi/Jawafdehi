import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import { caseStructuredData, entityStructuredData } from '../../src/utils/structured-data';

// Structured data that is merely plausible is worse than none: a consumer that
// validates rejects the node, and one that does not silently believes a wrong
// claim. So the graph is checked against the real schema.org vocabulary rather
// than against our idea of it.
//
// This caught a live defect. The entity node carried `inLanguage`, `isPartOf` and
// `license`, all of which schema.org scopes to CreativeWork — and an entity is a
// Person, an Organization or a Place. Three domain violations on every entity
// page, plus the wrong claim in prose ("this official is licensed CC0", when the
// licence covers the archive's record about them). The fix split the graph into a
// WebPage record node and the entity it is about; this test is what keeps them
// split.
//
// The fixture is a slice of schemaorg-current-https.jsonld: the domain and range
// of every property this repo can emit, plus the subClassOf chains of every class
// it can emit. Regenerate it — and re-read the domains while you are there — when
// you add a property. An unknown property fails loudly rather than being skipped,
// which is the point: a new property must be looked up, not assumed.

interface Vocabulary {
  properties: Record<string, { domain: string[]; range: string[] }>;
  subClassOf: Record<string, string[]>;
}

const VOCAB: Vocabulary = JSON.parse(
  readFileSync(resolve(__dirname, 'schema-org-vocabulary.json'), 'utf8'),
);

const STRUCTURAL = new Set(['@context', '@type', '@id']);
const DATATYPES = new Set([
  'Text',
  'URL',
  'Boolean',
  'Date',
  'DateTime',
  'Number',
  'Integer',
  'Float',
]);

/** A class plus every superclass of it, transitively. */
function ancestors(cls: string, seen = new Set<string>()): Set<string> {
  if (seen.has(cls)) return seen;
  seen.add(cls);
  for (const parent of VOCAB.subClassOf[cls] ?? []) ancestors(parent, seen);
  return seen;
}

/** Which schema.org types a value could satisfy. */
function valueTypes(value: unknown): Set<string> {
  if (typeof value === 'boolean') return new Set(['Boolean']);
  if (typeof value === 'number') return new Set(['Number', 'Integer', 'Float']);
  if (value && typeof value === 'object') {
    const type = (value as Record<string, unknown>)['@type'];
    return typeof type === 'string' ? ancestors(type) : new Set(['Thing']);
  }
  if (typeof value === 'string') {
    const out = new Set(['Text']);
    if (/^https?:\/\//.test(value)) out.add('URL');
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      out.add('Date');
      out.add('DateTime');
    }
    return out;
  }
  return new Set();
}

interface Violation {
  path: string;
  message: string;
}

function validate(node: Record<string, unknown>, path: string, out: Violation[]): void {
  const type = node['@type'];
  expect(typeof type, `${path}: every node needs an @type`).toBe('string');
  const nodeAncestors = ancestors(type as string);
  if (!(type as string in VOCAB.subClassOf) && type !== 'Thing') {
    out.push({ path, message: `@type '${type}' is not in the vocabulary fixture` });
  }

  for (const [key, value] of Object.entries(node)) {
    if (STRUCTURAL.has(key)) continue;

    const property = VOCAB.properties[key];
    if (!property) {
      out.push({
        path,
        message: `property '${key}' is not in the vocabulary fixture — look up its domain and range on schema.org and regenerate the fixture`,
      });
      continue;
    }

    const domain = new Set(property.domain);
    if (domain.size > 0 && ![...domain].some((cls) => nodeAncestors.has(cls))) {
      out.push({
        path,
        message: `'${key}' is not valid on ${type} — schema.org scopes it to ${property.domain.join(', ')}`,
      });
    }

    const range = new Set(property.range);
    for (const item of Array.isArray(value) ? value : [value]) {
      const types = valueTypes(item);
      if (range.size > 0 && ![...range].some((cls) => types.has(cls))) {
        out.push({
          path,
          message: `'${key}' value does not satisfy range ${property.range.join(', ')}`,
        });
      }
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const nested = item as Record<string, unknown>;
        if (typeof nested['@type'] === 'string') validate(nested, `${path}.${key}`, out);
      }
    }
  }
}

function violationsFor(nodes: Array<Record<string, unknown>>, label: string): string[] {
  const out: Violation[] = [];
  nodes.forEach((node, index) => validate(node, `${label}[${index}]`, out));
  return out.map((v) => `${v.path}: ${v.message}`);
}

// Every entity_type the live API actually emits, sampled across 100 cases, plus
// the unmapped and absent cases. The comma-joined values are real: the class comes
// first and `jawafdehi:` refinements follow.
const REAL_ENTITY_TYPES = [
  'Person',
  'Organization',
  'Place',
  'GovernmentOrganization',
  'Courthouse',
  'AdministrativeArea',
  'AdministrativeArea,jawafdehi:District',
  'AdministrativeArea,jawafdehi:Province',
  'AdministrativeArea,jawafdehi:Municipality',
  'AdministrativeArea,jawafdehi:MetropolitanCity',
  'jawafdehi:NotASchemaClass',
  null,
];

describe('the emitted graph is valid schema.org', () => {
  it('validates a fully-populated case', () => {
    const nodes = caseStructuredData({
      canonicalUrl: 'https://jawafdehi.org/case/example-case',
      title: 'नमुना नगरपालिका खरिद प्रकरण',
      description: 'परीक्षण विवरण।',
      imageUrl: 'https://s3.jawafdehi.org/thumb.webp',
      datePublished: '2026-07-22',
      dateModified: '2026-07-23T10:00:00Z',
      language: 'ne',
      tags: ['procurement', 'municipal'],
      caseType: 'CORRUPTION',
      entities: REAL_ENTITY_TYPES.map((entity_type, i) => ({
        display_name: `Party ${i}`,
        nes_id: `https://jawafdehi.org/entity/person/party-${i}`,
        entity_type,
        type: 'accused',
      })),
      authors: [{ display_name: 'Author', slug: 'author', has_public_page: true }],
      apiUrl: 'https://api.jawafdehi.org/api/cases/example-case/',
    });

    expect(violationsFor(nodes, 'case')).toEqual([]);
  });

  it('validates a minimal case', () => {
    const nodes = caseStructuredData({
      canonicalUrl: 'https://jawafdehi.org/case/bare',
      title: 'Bare',
    });

    expect(violationsFor(nodes, 'case')).toEqual([]);
  });

  it.each(REAL_ENTITY_TYPES)('validates an entity of type %s', (entityType) => {
    const nodes = entityStructuredData({
      canonicalUrl: 'https://jawafdehi.org/entity/prefix/slug',
      iri: 'https://jawafdehi.org/entity/prefix/slug',
      entityType,
      name: 'Test Entity',
      nameAlternate: 'परीक्षण',
      aliases: ['Alias'],
      description: 'A description.',
      imageUrl: 'https://s3.jawafdehi.org/entity.webp',
      officialUrl: 'https://example.invalid/',
      sameAs: ['https://www.wikidata.org/wiki/Q1'],
      apiUrl: 'https://api.jawafdehi.org/api/entities/prefix/slug',
      language: 'en',
    });

    expect(violationsFor(nodes, 'entity')).toEqual([]);
  });

  it('validates a minimal entity', () => {
    const nodes = entityStructuredData({
      canonicalUrl: 'https://jawafdehi.org/entity/prefix/slug',
      name: 'Bare',
    });

    expect(violationsFor(nodes, 'entity')).toEqual([]);
  });

  it('would actually catch a CreativeWork property on a non-CreativeWork', () => {
    // The check has to be able to fail, or the assertions above are decoration.
    // This is the exact defect the split fixed, reconstructed by hand.
    const bad = [
      {
        '@type': 'Person',
        '@id': 'https://jawafdehi.org/entity/person/someone',
        name: 'Someone',
        license: 'https://creativecommons.org/publicdomain/zero/1.0/',
        inLanguage: 'ne',
      },
    ];

    const violations = violationsFor(bad, 'bad');
    expect(violations).toHaveLength(2);
    expect(violations.join('\n')).toContain("'license' is not valid on Person");
    expect(violations.join('\n')).toContain("'inLanguage' is not valid on Person");
  });
});
