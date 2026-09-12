import { readFileSync } from 'node:fs';

import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// A head with two of anything is worse than a head with none: a scraper picks
// whichever it reaches first, so a duplicate canonical or og:title silently makes
// the wrong one authoritative. The Worker builds these heads by STRIPPING the
// shell's tags and appending its own, which is exactly the operation that produces
// duplicates when a strip misses.
//
// So this counts. Every tag that must appear exactly once is asserted at one, on
// both of the paths the Worker injects into, against a shell shaped like the real
// pre-rendered homepage — `data-rh="true"` attributes included, because that is
// what react-helmet-async emits and what the strip regexes have to match.

// Mirrors the real dist/index.html head: helmet-attributed tags, the site-level
// ld+json, the module entry after it, and the dehydrated query state in the body.
const SHELL =
  '<!doctype html><html lang="ne"><head>' +
  '<title data-rh="true">Jawafdehi Initiative</title>' +
  '<meta data-rh="true" name="description" content="Home page"/>' +
  '<meta data-rh="true" property="og:title" content="Home page"/>' +
  '<meta data-rh="true" property="og:locale" content="ne_NP"/>' +
  '<meta name="twitter:site" content="@jawafdehi"/>' +
  '<meta data-rh="true" name="twitter:title" content="Home page"/>' +
  '<link data-rh="true" rel="canonical" href="https://jawafdehi.org/"/>' +
  '<script data-rh="true" type="application/ld+json">{"@type":"WebSite","name":"Jawafdehi"}</script>' +
  '<script type="module" crossorigin src="/assets/index-abc123.js"></script>' +
  '</head><body>' +
  '<script id="__REACT_QUERY_STATE__" type="application/json">{"queries":[]}</script>' +
  '</body></html>';

function envWith(shell: string) {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response(shell, { status: 200, headers: { 'content-type': 'text/html' } })
          : new Response('not found', { status: 404 }),
    },
  };
}

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

const CASE_PAYLOAD = {
  title: 'दमक प्रकरण',
  slug: 'damak',
  state: 'PUBLISHED',
  case_type: 'CORRUPTION',
  description: 'विवरण',
  tags: ['land'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  entities: [
    { display_name: 'X', nes_id: 'https://jawafdehi.org/entity/person/x', entity_type: 'Person' },
  ],
};

const ENTITY_PAYLOAD = {
  '@id': 'https://jawafdehi.org/entity/deptofsurvey/office',
  '@type': 'GovernmentOrganization',
  name: { en: 'An Office', ne: 'कार्यालय' },
  description: { en: 'A description.' },
  url: 'https://example.invalid/',
};

async function headOf(path: string, shell = SHELL): Promise<string> {
  const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), envWith(shell));
  const html = await res.text();
  return html.slice(0, html.indexOf('</head>'));
}

function occurrences(haystack: string, pattern: RegExp): number {
  return (haystack.match(pattern) || []).length;
}

// Tags where more than one is a defect, not a preference.
const SINGLETONS: Array<[string, RegExp]> = [
  ['<title>', /<title[^>]*>/g],
  ['rel=canonical', /rel="canonical"/g],
  ['og:locale', /property="og:locale"/g],
  ['og:locale:alternate', /property="og:locale:alternate"/g],
  ['og:url', /property="og:url"/g],
  ['og:type', /property="og:type"/g],
  ['og:title', /property="og:title"/g],
  ['og:image', /property="og:image"/g],
  ['og:site_name', /property="og:site_name"/g],
  ['meta description', /name="description"/g],
  ['twitter:card', /name="twitter:card"/g],
  ['twitter:title', /name="twitter:title"/g],
  ['twitter:site', /name="twitter:site"/g],
  ['ld+json', /application\/ld\+json/g],
  ['module entry', /<script type="module"/g],
];

describe.each([
  ['case', '/case/damak', CASE_PAYLOAD],
  ['entity', '/entity/deptofsurvey/office', ENTITY_PAYLOAD],
])('%s page head hygiene', (_label, path, payload) => {
  it.each(SINGLETONS)('emits exactly one %s', async (_name, pattern) => {
    stubApi(payload);
    expect(occurrences(await headOf(path), pattern)).toBe(1);
  });

  it('keeps the scripts the page needs to run', async () => {
    stubApi(payload);
    const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), envWith(SHELL));
    const html = await res.text();

    // The strip is scoped to ld+json. Losing the module entry blanks the page;
    // losing the dehydrated state refetches every query on load.
    expect(html).toContain('<script type="module" crossorigin src="/assets/index-abc123.js">');
    expect(html).toContain('__REACT_QUERY_STATE__');
  });

  it('leaves no helmet placeholder or shell copy behind', async () => {
    stubApi(payload);
    const head = await headOf(path);

    expect(head).not.toContain('<!--helmet-');
    expect(head).not.toContain('content="Home page"');
    expect(head).not.toContain('Jawafdehi Initiative</title>');
  });
});

describe('the ld+json strip handles every legal way to spell the tag', () => {
  const variants: Array<[string, string]> = [
    ['data-rh before type', '<script data-rh="true" type="application/ld+json">{"a":1}</script>'],
    ['type before other attributes', '<script type="application/ld+json" data-rh="true">{"a":1}</script>'],
    ['single quotes', `<script type='application/ld+json'>{"a":1}</script>`],
    ['uppercase tag and attribute', '<SCRIPT TYPE="application/ld+json">{"a":1}</SCRIPT>'],
    ['whitespace around the equals', '<script type = "application/ld+json">{"a":1}</script>'],
    ['a newline inside the tag', '<script\n  type="application/ld+json">{"a":1}</script>'],
    ['two nodes', '<script type="application/ld+json">{"a":1}</script><script type="application/ld+json">{"b":2}</script>'],
  ];

  it.each(variants)('strips %s', async (_label, snippet) => {
    const shell =
      '<!doctype html><html><head><title>Home</title>' +
      '<meta name="description" content="Home"/>' +
      snippet +
      '<script type="module" src="/entry.js"></script>' +
      '</head><body></body></html>';
    stubApi(CASE_PAYLOAD);
    const head = await headOf('/case/damak', shell);

    // Exactly one left: the record's own.
    expect(occurrences(head, /application\/ld\+json/g)).toBe(1);
    expect(occurrences(head, /<script type="module"/g)).toBe(1);
  });

  it('does not touch a plain application/json script', async () => {
    const shell =
      '<!doctype html><html><head><title>Home</title>' +
      '<meta name="description" content="Home"/>' +
      '<script type="application/json" id="keepme">{"k":1}</script>' +
      '<script type="application/ld+json">{"a":1}</script>' +
      '</head><body></body></html>';
    stubApi(CASE_PAYLOAD);
    const head = await headOf('/case/damak', shell);

    // application/json is not application/ld+json — the dehydrated query state
    // uses exactly this type.
    expect(head).toContain('id="keepme"');
    expect(occurrences(head, /application\/ld\+json/g)).toBe(1);
  });
});

describe('og:type describes what the page is actually about', () => {
  it('is article for a case', async () => {
    stubApi(CASE_PAYLOAD);
    const head = await headOf('/case/damak');

    expect(head).toContain('<meta property="og:type" content="article" />');
  });

  // Open Graph's `profile` exists to carry profile:first_name / last_name /
  // username / gender — it means A PERSON. Most entities in this archive are
  // ministries, survey offices, courts, districts and municipalities, and telling
  // an unfurler to look for a district's given name is simply wrong.
  it.each([
    ['Person', 'profile'],
    ['Organization', 'website'],
    ['GovernmentOrganization', 'website'],
    ['AdministrativeArea', 'website'],
    ['AdministrativeArea,jawafdehi:District', 'website'],
    ['Courthouse', 'website'],
    ['Place', 'website'],
    [null, 'website'],
  ])('is %s -> og:type %s', async (entityType, expected) => {
    stubApi({ ...ENTITY_PAYLOAD, '@type': entityType });
    const head = await headOf('/entity/deptofsurvey/office');

    expect(head).toContain(`<meta property="og:type" content="${expected}" />`);
  });
});

describe('the real built shell is shaped the way these tests assume', () => {
  // If the build starts emitting a head this fixture no longer resembles, the
  // assertions above stop meaning anything. This is the tripwire.
  it('has helmet attributes, one ld+json node, and a module entry', () => {
    let built: string;
    try {
      built = readFileSync('dist/index.html', 'utf8');
    } catch {
      // dist/ is a build artifact and is not present in a fresh checkout.
      return;
    }
    const head = built.slice(0, built.indexOf('</head>'));

    expect(head).toContain('data-rh="true"');
    expect(occurrences(head, /application\/ld\+json/g)).toBe(1);
    expect(occurrences(head, /<script type="module"/g)).toBe(1);
    expect(built).toContain('__REACT_QUERY_STATE__');
  });
});
