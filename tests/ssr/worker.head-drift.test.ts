import { readFileSync } from 'node:fs';

import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';
import { buildHeadTags, renderHeadTagsToHtml } from '../../src/utils/seo';
import { caseHeadInput, entityHeadInput, PUBLIC_API_BASE } from '../../src/utils/record-head';

// A case page's head is produced twice: by pages/CaseDetail.tsx for client-side
// navigation, and by worker.ts for anything that does not run JavaScript. Case
// pages are not pre-rendered, so the edge copy is the ONLY one a crawler or an
// agent ever reads — which is exactly the condition under which the two quietly
// diverge, because nobody looking at the site notices.
//
// They HAD diverged. Comparing the two mappings by hand found four differences:
//
//   • the edge fell back to a real sentence for a case with no description and no
//     allegations, the page emitted an empty description meta;
//   • the page did not percent-encode the slug into the canonical URL;
//   • the page built its rel=alternate href from API_BASE_URL, which resolves to
//     the SITE origin in production, so it advertised
//     https://jawafdehi.org/api/cases/<slug>/ — a path nothing serves;
//   • allegations were truncated at a different point in each.
//
// This is the same bug class that had og:locale saying ne_NP in the pages and
// en_US at the edge across 20 pages. buildHeadTags fixed the shared tag LIST; it
// did not share the mapping that produces the input, so the seam just moved.
//
// The fix is structural: one mapper, in utils/record-head. This test is what keeps
// it that way — it renders the head the Worker actually serves and asserts it is
// byte-identical to the head built from the same mapper, so reintroducing a
// second hand-written mapping fails here rather than in production.

const SHELL =
  '<!doctype html><html><head><title>Jawafdehi</title>' +
  '<meta name="description" content="Home page" />' +
  '<link rel="canonical" href="https://jawafdehi.org/" />' +
  '</head><body></body></html>';

const env = {
  ASSETS: {
    fetch: async (req: Request) =>
      new URL(req.url).pathname === '/'
        ? new Response(SHELL, { status: 200, headers: { 'content-type': 'text/html' } })
        : new Response('not found', { status: 404 }),
  },
};

function stubApi(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function servedHead(path: string): Promise<string> {
  const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), env);
  const html = await res.text();
  return html.slice(0, html.indexOf('</head>'));
}

// The real case record from the live API, so this runs against the shape the
// backend actually returns — 194 bound entities, Devanagari title, real dates.
const REAL_CASE_PATH = '/home/uakarki/.kiro/crew/workspace/review-tools/fx/case.json';

function realCase(): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(REAL_CASE_PATH, 'utf8')) as Record<string, unknown>;
  } catch {
    return null; // Fixture is a review artifact, not committed.
  }
}

describe('the head the Worker serves is the head the mapper builds', () => {
  const CASE = {
    title: 'नमुना नगरपालिका खरिद प्रकरण',
    slug: 'namuna-nagarpalika-kharid-prakaran',
    state: 'PUBLISHED',
    case_type: 'PROCUREMENT_FRAUD',
    description: 'परीक्षण विवरण।',
    key_allegations: ['खरिद प्रक्रियामा अनियमितता'],
    tags: ['procurement'],
    created_at: '2026-01-01T00:00:00Z',
    case_publish_date: '2026-01-05',
    updated_at: '2026-01-02T00:00:00Z',
    entities: [
      {
        display_name: 'Namuna Nagarpalika',
        nes_id: 'https://jawafdehi.org/entity/namunapalika/namuna',
        entity_type: 'GovernmentOrganization',
        type: 'accused',
      },
    ],
    authors: [{ display_name: 'Test Author', slug: 'test-author', has_public_page: true }],
  };

  const ENTITY = {
    '@id': 'https://jawafdehi.org/entity/namunapalika/namuna',
    '@type': 'GovernmentOrganization',
    name: { en: 'Namuna Nagarpalika', ne: 'नमुना नगरपालिका' },
    description: { en: 'A fictional municipality used in tests.' },
    alternateName: { ne: ['नमुना न.पा.'] },
    url: 'https://example.invalid/',
  };

  it('for a case', async () => {
    stubApi(CASE);
    const served = await servedHead(`/case/${CASE.slug}`);

    // The edge omits `language` on purpose: a crawler should see this
    // Nepali-first site declare itself Nepali.
    const expected = renderHeadTagsToHtml(buildHeadTags(caseHeadInput(CASE, CASE.slug)));

    expect(served).toContain(expected);
  });

  it('for an entity', async () => {
    stubApi(ENTITY);
    const served = await servedHead('/entity/namunapalika/namuna');

    const expected = renderHeadTagsToHtml(
      buildHeadTags(entityHeadInput(ENTITY, ['namunapalika', 'namuna'])),
    );

    expect(served).toContain(expected);
  });

  it('for the real API record, not just a fixture', async () => {
    const record = realCase();
    if (!record) return;

    stubApi(record);
    const slug = String(record.slug);
    const served = await servedHead(`/case/${slug}`);
    const expected = renderHeadTagsToHtml(buildHeadTags(caseHeadInput(record, slug)));

    expect(served).toContain(expected);
  });
});

describe('the mapper closes the specific drifts that were found', () => {
  it('falls back to a real description sentence, never an empty meta', () => {
    // The page used to emit description="" here while the edge emitted a sentence.
    const input = caseHeadInput({ title: 'T', slug: 's' }, 's');

    expect(input.description).toBe(
      'A verified corruption and misconduct case documented by Jawafdehi Initiative.',
    );
  });

  it('percent-encodes the slug into the canonical URL', () => {
    // The page interpolated the raw slug; the edge encoded it.
    const input = caseHeadInput({ title: 'T', slug: 'a b/c' }, 'a b/c');

    expect(input.canonicalUrl).toBe('https://jawafdehi.org/case/a%20b%2Fc');
  });

  it('points the alternate href at the API host, not the site origin', () => {
    // The page used API_BASE_URL, which is same-origin in production, so it
    // advertised https://jawafdehi.org/api/cases/<slug>/ — nothing serves that.
    const input = caseHeadInput({ title: 'T', slug: 'real-slug' }, 'real-slug');
    const jsonAlternate = input.alternates?.find((a) => a.type === 'application/json');

    expect(jsonAlternate?.href).toBe(`${PUBLIC_API_BASE}/cases/real-slug/`);
    expect(jsonAlternate?.href.startsWith('https://api.jawafdehi.org/')).toBe(true);
  });

  it('prefers the record’s own slug over the one the URL carried', () => {
    // A renamed case keeps serving on the old URL; the canonical must be current.
    const input = caseHeadInput({ title: 'T', slug: 'new-slug' }, 'old-slug');

    expect(input.canonicalUrl).toBe('https://jawafdehi.org/case/new-slug');
  });

  it('prefers the archive’s publish date over the row timestamp', () => {
    const withPublishDate = caseHeadInput(
      { title: 'T', slug: 's', case_publish_date: '2026-07-22', created_at: '2026-01-01T00:00:00Z' },
      's',
    );
    const graph = (withPublishDate.jsonLd as Array<Record<string, unknown>>)[0];

    expect(graph.datePublished).toBe('2026-07-22');
  });
});
