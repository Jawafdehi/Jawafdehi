import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// Case pages are not pre-rendered, and entity pages are not either (pre-render
// collects entity ids from a field the case serializer stopped returning). So the
// Worker's injected head is the ONLY head a crawler or an agent ever reads for
// either page type. Structured data and the JSON alternate that live only in the
// React tree reach nothing but client-side navigation — which is why they are
// asserted here, against the real worker, rather than in a component test.

// The shell is the pre-rendered homepage. It carries the site-level WebSite node,
// which must not ride along on a record URL as a second competing graph.
const INDEX_HTML =
  '<!doctype html><html><head>' +
  '<title>Jawafdehi</title>' +
  '<meta name="description" content="Home page" />' +
  '<meta name="twitter:site" content="@jawafdehi" />' +
  '<link rel="canonical" href="https://jawafdehi.org/" />' +
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Jawafdehi Initiative"}</script>' +
  '<script type="module" src="/assets/index.js"></script>' +
  '</head><body>' +
  '<script id="__REACT_QUERY_STATE__" type="application/json">{"queries":[]}</script>' +
  '</body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        if (new URL(req.url).pathname === '/') {
          return new Response(INDEX_HTML, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        }
        return new Response('not found', { status: 404 });
      },
    },
  };
}

// Fictional, per the fixture rule on this repo: an invented allegation must never
// be attached to a real body.
const CASE_TITLE = 'नमुना नगरपालिका खरिद प्रकरण';
const CASE_SLUG = 'namuna-nagarpalika-kharid-prakaran';
const ENTITY_IRI = 'https://jawafdehi.org/entity/namunapalika/namuna-nagarpalika';

function stubApi(payloads: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      for (const [fragment, body] of Object.entries(payloads)) {
        if (url.includes(fragment)) {
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
      return new Response('', { status: 404 });
    }),
  );
}

function graphNodes(html: string): Array<Record<string, unknown>> {
  const head = html.slice(0, html.indexOf('</head>'));
  return [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => JSON.parse(match[1]) as Record<string, unknown>,
  );
}

async function fetchPage(path: string): Promise<string> {
  const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), makeEnv());
  return res.text();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker: case page structured data', () => {
  const casePayload = {
    title: CASE_TITLE,
    slug: CASE_SLUG,
    state: 'PUBLISHED',
    case_type: 'PROCUREMENT_FRAUD',
    description: 'परीक्षण विवरण।',
    tags: ['procurement', 'municipal'],
    created_at: '2026-01-01T00:00:00Z',
    case_publish_date: '2026-01-05',
    updated_at: '2026-01-02T00:00:00Z',
    entities: [
      {
        display_name: 'Namuna Nagarpalika',
        nes_id: ENTITY_IRI,
        entity_type: 'GovernmentOrganization',
        type: 'accused',
      },
    ],
    authors: [{ display_name: 'Test Author', slug: 'test-author', has_public_page: true }],
  };

  it('emits the case as a Report graph', async () => {
    stubApi({ '/cases/': casePayload });
    const nodes = graphNodes(await fetchPage(`/case/${CASE_SLUG}`));

    expect(nodes).toHaveLength(1);
    expect(nodes[0]['@type']).toBe('Report');
    expect(nodes[0].headline).toBe(CASE_TITLE);
    expect(nodes[0].genre).toBe('PROCUREMENT_FRAUD');
    // The publish date the archive assigns wins over the row's created_at.
    expect(nodes[0].datePublished).toBe('2026-01-05');
  });

  it('replaces the shell WebSite node instead of stacking a second graph', async () => {
    stubApi({ '/cases/': casePayload });
    const nodes = graphNodes(await fetchPage(`/case/${CASE_SLUG}`));

    expect(nodes.map((node) => node['@type'])).toEqual(['Report']);
  });

  it('keeps the shell scripts the page needs to run', async () => {
    stubApi({ '/cases/': casePayload });
    const html = await fetchPage(`/case/${CASE_SLUG}`);

    // Only ld+json is stripped. Dropping the module entry would blank the page,
    // and dropping the dehydrated state would refetch every query on load.
    expect(html).toContain('<script type="module" src="/assets/index.js">');
    expect(html).toContain('__REACT_QUERY_STATE__');
  });

  it('binds the accused to its canonical entity IRI', async () => {
    stubApi({ '/cases/': casePayload });
    const about = graphNodes(await fetchPage(`/case/${CASE_SLUG}`))[0].about as Array<
      Record<string, unknown>
    >;

    expect(about[0]['@id']).toBe(ENTITY_IRI);
    expect(about[0]['@type']).toBe('GovernmentOrganization');
  });

  it('advertises the JSON record and the oEmbed endpoint', async () => {
    stubApi({ '/cases/': casePayload });
    const html = await fetchPage(`/case/${CASE_SLUG}`);

    expect(html).toContain(
      `<link rel="alternate" type="application/json" href="https://api.jawafdehi.org/api/cases/${CASE_SLUG}/"`,
    );
    expect(html).toContain('type="application/json+oembed"');
  });

  it('survives a title containing markup without breaking out of the script', async () => {
    stubApi({
      '/cases/': { ...casePayload, title: 'Case </script><script>alert(1)</script>' },
    });
    const html = await fetchPage(`/case/${CASE_SLUG}`);

    // The injected graph must still parse as one script, and the payload must not
    // have become live markup in the head.
    const nodes = graphNodes(html);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].headline).toBe('Case </script><script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe('worker: entity page metadata', () => {
  const entityPayload = {
    '@id': ENTITY_IRI,
    '@type': 'GovernmentOrganization',
    name: { en: 'Namuna Nagarpalika', ne: 'नमुना नगरपालिका' },
    description: { en: 'A fictional municipality used in tests.', ne: 'परीक्षण विवरण।' },
    alternateName: { en: ['Namuna Municipality'], ne: ['नमुना न.पा.'] },
    url: 'https://example.invalid/',
  };

  it('gives an entity page its own title instead of the homepage head', async () => {
    stubApi({ '/entities/': entityPayload });
    const html = await fetchPage('/entity/namunapalika/namuna-nagarpalika');

    expect(html).toContain('<title>Namuna Nagarpalika | Jawafdehi Entity Registry</title>');
    expect(html).not.toContain('content="Home page"');
    expect(html).toContain(
      '<link rel="canonical" href="https://jawafdehi.org/entity/namunapalika/namuna-nagarpalika" />',
    );
  });

  it('emits the entity graph keyed on the canonical IRI', async () => {
    stubApi({ '/entities/': entityPayload });
    const nodes = graphNodes(await fetchPage('/entity/namunapalika/namuna-nagarpalika'));

    expect(nodes).toHaveLength(1);
    expect(nodes[0]['@id']).toBe(ENTITY_IRI);
    expect(nodes[0]['@type']).toBe('GovernmentOrganization');
    // Same identifier the case graph uses for `about` — the join key.
    expect(nodes[0].sameAs).toEqual(['https://example.invalid/']);
  });

  it('advertises the JSON-LD record behind the page', async () => {
    stubApi({ '/entities/': entityPayload });
    const html = await fetchPage('/entity/namunapalika/namuna-nagarpalika');

    expect(html).toContain(
      '<link rel="alternate" type="application/json" href="https://api.jawafdehi.org/api/entities/namunapalika/namuna-nagarpalika"',
    );
  });

  it('serves a real 404 for an entity the registry does not hold', async () => {
    stubApi({});
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/entity/nope/not-a-real-entity'),
      makeEnv(),
    );

    expect(res.status).toBe(404);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });
});
