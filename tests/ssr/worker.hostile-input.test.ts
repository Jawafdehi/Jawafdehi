import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// The Worker builds a page's head out of a payload it does not control. Two
// failure modes matter, and both were real:
//
//   1. A throw here is not a missing tag — it is a 500 for the whole page. A
//      single `null` inside a case's `entities[]` reached a property access and
//      threw, which would have taken down EVERY case page the moment one
//      malformed row appeared. Injecting share metadata is an enhancement; its
//      correct failure is the plain shell.
//
//   2. The entity IRI tail is attacker-supplied and is interpolated into an
//      upstream API path. `encodeURIComponent` does not touch dots, and the slash
//      between prefix and slug has to stay a real slash for the record endpoint to
//      resolve — so there is no encoding that is both correct and inherently safe.
//      The tail is validated against an allowlist instead.

const SHELL =
  '<!doctype html><html><head>' +
  '<title>Jawafdehi</title>' +
  '<meta name="description" content="Home page" />' +
  '<link rel="canonical" href="https://jawafdehi.org/" />' +
  '</head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response(SHELL, { status: 200, headers: { 'content-type': 'text/html' } })
          : new Response('not found', { status: 404 }),
    },
  };
}

const fetched: string[] = [];

function stubApi(body: unknown, status = 200) {
  fetched.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      fetched.push(
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
      );
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fetchPage(path: string) {
  const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), makeEnv());
  return { status: res.status, html: await res.text() };
}

function graph(html: string): Record<string, unknown> | null {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return match ? (JSON.parse(match[1]) as Record<string, unknown>) : null;
}

describe('worker survives malformed case payloads', () => {
  // Each of these threw or produced junk before the hardening. `entities` and
  // `authors` holding a null are the ones that actually crashed.
  const payloads: Array<[string, Record<string, unknown>]> = [
    ['an empty object', {}],
    ['entities: null', { title: 'T', slug: 's', entities: null }],
    ['entities holding null, numbers, strings, arrays', {
      title: 'T',
      slug: 's',
      entities: [null, 42, 'str', {}, []],
    }],
    ['authors holding null and a numeric name', {
      title: 'T',
      slug: 's',
      authors: [null, 7, { display_name: 5 }],
    }],
    ['tags as a bare string', { title: 'T', slug: 's', tags: 'not-an-array' }],
    ['tags holding null and a number', { title: 'T', slug: 's', tags: [null, 42] }],
    ['a numeric title', { title: 12345, slug: 's' }],
    ['null title and slug', { title: null, slug: null }],
    ['junk dates', { title: 'T', slug: 's', created_at: 99, updated_at: {}, case_publish_date: [] }],
    ['a non-string case_type', { title: 'T', slug: 's', case_type: { a: 1 } }],
  ];

  it.each(payloads)('answers 200 with parseable JSON-LD for %s', async (_label, payload) => {
    stubApi(payload);
    const { status, html } = await fetchPage('/case/some-slug');

    expect(status).toBe(200);
    // Parses, rather than merely being present.
    expect(graph(html)).not.toBeNull();
  });

  it('drops unreadable rows instead of throwing on them', async () => {
    stubApi({ title: 'T', slug: 's', entities: [null], authors: [null] });
    const node = graph((await fetchPage('/case/some-slug')).html);

    expect('about' in node!).toBe(false);
    expect('author' in node!).toBe(false);
  });

  it('never turns a null tag into the keyword "null"', async () => {
    stubApi({ title: 'T', slug: 's', tags: [null, 42, 'procurement'] });
    const node = graph((await fetchPage('/case/some-slug')).html);

    expect(node!.keywords).toEqual(['procurement']);
  });

  it('keeps the head bounded when the description is enormous', async () => {
    stubApi({ title: 'T', slug: 's', description: 'x'.repeat(200_000) });
    const { html } = await fetchPage('/case/some-slug');

    // truncateMeta bounds the meta description; without it the head alone would
    // be 200 KB on every crawl.
    expect(html.indexOf('</head>')).toBeLessThan(10_000);
  });

  it('escapes a title that tries to close the script or an attribute', async () => {
    stubApi({
      title: '</script><img src=x onerror=alert(1)>',
      slug: 's',
      description: '"><script>alert(2)</script>',
      state: 'PUBLISHED',
    });
    const { html } = await fetchPage('/case/some-slug');
    const head = html.slice(0, html.indexOf('</head>'));

    // Exactly one script in the head, and no live markup: `<` is &lt; inside an
    // attribute and \u003c inside the graph.
    expect(head.match(/<script/g)).toHaveLength(1);
    expect(head).not.toContain('<img');
    expect(head).not.toContain('<script>alert');
    expect(graph(html)!.headline).toBe('</script><img src=x onerror=alert(1)>');
  });
});

describe('worker survives malformed entity payloads', () => {
  const payloads: Array<[string, unknown, number]> = [
    ['an empty object', {}, 200],
    ['a null name', { name: null, '@type': 'Person' }, 200],
    ['a numeric name', { name: 42 }, 200],
    ['@type as an array', { '@type': ['Person', 'Thing'], name: { en: 'X' } }, 200],
    ['@type as a number', { '@type': 7, name: { en: 'X' } }, 200],
    ['alternateName as a number', { name: { en: 'X' }, alternateName: 42 }, 200],
    ['alternateName nesting objects', {
      name: { en: 'X' },
      alternateName: { en: [{ deep: 1 }, 'ok'] },
    }, 200],
    ['sameAs as an object', { name: { en: 'X' }, sameAs: { a: 1 } }, 200],
    ['a numeric url', { name: { en: 'X' }, url: 12 }, 200],
    ['HTML where JSON was promised', '<!doctype html><html>nope</html>', 200],
    ['an upstream 500', { detail: 'boom' }, 500],
    ['an empty body', '', 200],
  ];

  it.each(payloads)('answers %s without throwing', async (_label, body, status) => {
    stubApi(body, status);
    const res = await fetchPage('/entity/prefix/slug');

    expect([200, 404]).toContain(res.status);
  });

  it('degrades to the shell rather than 500 when the API cannot be read', async () => {
    stubApi('<!doctype html><html>not json</html>');
    const { status, html } = await fetchPage('/entity/prefix/slug');

    expect(status).toBe(200);
    expect(html).toContain('<title>Jawafdehi</title>');
  });

  it('degrades to the shell when the upstream fetch throws outright', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const { status, html } = await fetchPage('/entity/prefix/slug');

    expect(status).toBe(200);
    expect(html).toContain('<title>Jawafdehi</title>');
  });
});

describe('the entity IRI tail is validated, not merely encoded', () => {
  // Each of these must never reach the API. encodeURIComponent leaves dots alone,
  // so a `..` segment would otherwise have survived into the upstream path.
  const rejected = [
    ['a traversal segment', '/entity/%2E%2E/%2E%2E/admin'],
    ['a NUL byte', '/entity/a%00b/c'],
    ['more segments than an IRI tail has', '/entity/a/b/c/d/e/f/g/h/i/j/k'],
    ['an @ that could read as userinfo', '/entity/@evil.example.com/x'],
    ['an absurd length', `/entity/${'a'.repeat(250)}/b`],
    ['a space', '/entity/a%20b/c'],
    ['a newline', '/entity/a%0Ab/c'],
  ];

  it.each(rejected)('never calls the API for %s', async (_label, path) => {
    stubApi({ name: { en: 'X' }, '@type': 'Person' });
    const res = await fetchPage(path);

    expect(fetched).toEqual([]);
    // Still a page, never a crash.
    expect([200, 404]).toContain(res.status);
  });

  it('still resolves a real IRI tail', async () => {
    stubApi({
      '@id': 'https://jawafdehi.org/entity/deptofsurvey/department-of-survey',
      '@type': 'AdministrativeArea',
      name: { en: 'Department of Survey, Damak' },
    });
    const { html } = await fetchPage('/entity/deptofsurvey/department-of-survey');

    expect(fetched).toEqual([
      'https://api.jawafdehi.org/api/entities/deptofsurvey/department-of-survey',
    ]);
    expect(html).toContain('Department of Survey, Damak | Jawafdehi Entity Registry');
  });
});
