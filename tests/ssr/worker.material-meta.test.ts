import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';

// Materials are the one record type that can NEVER be pre-rendered: there are
// 346,250 of them against Cloudflare's ceiling of 20,000 static asset files per
// Worker version. So unlike /case/* and /updates/*, where the edge fallback fills
// the gap between builds, here the edge IS the head — nothing else ever produces
// one for a client that does not run JS.
//
// Measured on production 2026-10-13, before this handler existed: every
// /material/* URL served dist/index.html verbatim, so all 346,250 of them carried
// the site-wide title, the site-wide description, and no canonical. These tests
// pin the parts a crawler reads.

// The shell the Worker actually gets: dist/index.html is the PRE-RENDERED
// homepage, with baked-in tags and no helmet placeholders. Using the raw template
// here would let a regression in stripOverriddenHeadTags pass unnoticed.
const INDEX_HTML =
  '<!doctype html><html lang="ne"><head>' +
  '<title>Jawafdehi Initiative — Nepal\'s Corruption Case Archive</title>\n' +
  '<meta name="description" content="Nepal\'s Permanent Corruption Case Archive.">\n' +
  '<meta property="og:title" content="Jawafdehi Initiative — Nepal\'s Corruption Case Archive">\n' +
  '<link rel="canonical" href="https://jawafdehi.org/">\n' +
  '</head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (path === '/') {
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

/** `GET /api/materials/<source>/<ident>/` answers with stored JSON-LD. */
function stubMaterialApi(body: Record<string, unknown> | null, status = 200) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request | string) => {
      calls.push(typeof input === 'string' ? input : input.url);
      if (status !== 200) return new Response('', { status });
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

const A_MATERIAL = {
  '@id': 'https://jawafdehi.org/material/document/oag-11353',
  '@type': 'Report',
  name: { en: 'National Risk Assessment Report' },
  description: { en: 'An assessment of money-laundering risk across sectors.' },
  datePublished: '2021-03-29',
  identifier: 'oag-11353',
};

beforeEach(() => {
  vi.stubGlobal('caches', {
    default: { match: async () => undefined, put: async () => undefined },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a material page carries its own head, not the homepage\'s', () => {
  it('names the document in the title and the description', async () => {
    stubMaterialApi(A_MATERIAL);

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/document/oag-11353'),
      makeEnv() as never,
      {} as never,
    );
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain(
      '<title>National Risk Assessment Report | Jawafdehi governance archive</title>',
    );
    expect(html).toContain('An assessment of money-laundering risk across sectors.');
  });

  it('strips the homepage tags it overrides, leaving exactly one of each', async () => {
    // The whole failure this fixes: the shell is the pre-rendered homepage, so
    // appending without stripping gives two <title> and two canonical in one
    // head — and a crawler reads the first, which is the homepage's.
    stubMaterialApi(A_MATERIAL);

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/document/oag-11353'),
      makeEnv() as never,
      {} as never,
    );
    const html = await res.text();

    expect(html.match(/<title\b/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).not.toContain("Nepal's Corruption Case Archive");
  });

  it('declares the slashless canonical the API sitemap also advertises', async () => {
    // Opposite of a case page. Case pages are pre-rendered to
    // /case/<slug>/index.html so the slashless form 307s; nothing is published
    // under /material/, so the slashless form answers 200 and is the canonical.
    stubMaterialApi(A_MATERIAL);

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/document/oag-11353'),
      makeEnv() as never,
      {} as never,
    );

    expect(await res.text()).toContain(
      'rel="canonical" href="https://jawafdehi.org/material/document/oag-11353"',
    );
  });

  it('emits the record as JSON-LD', async () => {
    stubMaterialApi(A_MATERIAL);

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/document/oag-11353'),
      makeEnv() as never,
      {} as never,
    );
    const html = await res.text();

    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(match).not.toBeNull();
    const parsed = JSON.parse(match![1].replace(/\\u003c/g, '<'));
    expect(parsed.name).toBe('National Risk Assessment Report');
    expect(parsed.url).toBe('https://jawafdehi.org/material/document/oag-11353');
    expect(parsed.datePublished).toBe('2021-03-29');
  });

  it('cannot be made to break out of the JSON-LD script element', async () => {
    // Via `name`, not `description`: descriptions go through stripHtml, so a tag
    // there is already gone by the time JSON.stringify sees it. `name` is used
    // verbatim as the display title, so it is the field that actually reaches
    // the script element — and `<` inside a <script> ends it even in JSON.
    stubMaterialApi({
      ...A_MATERIAL,
      name: { en: 'Report </script><script>alert(1)</script>' },
    });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/document/oag-11353'),
      makeEnv() as never,
      {} as never,
    );
    const html = await res.text();

    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c/script');
    // The head tags take the same string through escapeHtml, so it must not
    // have produced a live element there either.
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('re-encodes a tail that is not URL-safe', async () => {
    // Idents are upstream keys, and Devanagari ones occur. matchRoute hands the
    // splat back percent-DECODED, so a canonical built from it verbatim would
    // advertise a URL that is not the one being served.
    stubMaterialApi({ ...A_MATERIAL, '@id': 'https://jawafdehi.org/material/ag/क-1' });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/ag/%E0%A4%95-1'),
      makeEnv() as never,
      {} as never,
    );

    expect(await res.text()).toContain(
      'rel="canonical" href="https://jawafdehi.org/material/ag/%E0%A4%95-1"',
    );
  });
});

describe('a material with no description still says something specific', () => {
  it('names the document and its type rather than the site', async () => {
    // The fallback is the point of the whole change. A site-wide sentence here
    // is what made 346,250 URLs read as copies of the homepage.
    stubMaterialApi({
      '@id': 'https://jawafdehi.org/material/bolpatra/104987',
      '@type': 'Report',
      name: { en: 'Tender notice 104987' },
    });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/bolpatra/104987'),
      makeEnv() as never,
      {} as never,
    );
    const html = await res.text();

    expect(html).toContain('Tender notice 104987 — Report in the Jawafdehi governance archive.');
    expect(html).not.toContain('Permanent Corruption Case Archive');
  });

  it('falls back to the IRI tail when the record has no name either', async () => {
    stubMaterialApi({ '@id': 'https://jawafdehi.org/material/ag/56575', '@type': 'Report' });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/ag/56575'),
      makeEnv() as never,
      {} as never,
    );

    expect(await res.text()).toContain('<title>56575 | Jawafdehi governance archive</title>');
  });
});

describe('the fallback fails in the safe direction', () => {
  it('serves a real 404 when the API says the material does not exist', async () => {
    // A positive answer: a retired ident, a soft-deleted row, or one no longer
    // LISTED. A soft 404 keeps the URL in the index and keeps the crawler coming.
    stubMaterialApi(null, 404);

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/document/gone'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(404);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('serves the shell at 200 when the API is unreachable', async () => {
    // Not a 404. A 404 is what REMOVES a URL from the index, so deciding one
    // over a backend blip is strictly worse than serving a thin page — the same
    // reasoning handleCaseMetaFallback and isCasePageOutOfRange document.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/material/document/oag-11353'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(200);
  });

  it('asks the API for the encoded tail, with the trailing slash', async () => {
    const calls = stubMaterialApi(A_MATERIAL);

    await worker.fetch(
      new Request('https://jawafdehi.org/material/ag/%E0%A4%95-1'),
      makeEnv() as never,
      {} as never,
    );

    expect(calls[0]).toBe('https://api.jawafdehi.org/api/materials/ag/%E0%A4%95-1/');
  });
});
