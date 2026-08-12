import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// The head a social scraper gets for /case/* and /updates/* comes from the
// Worker, not from the app's <Seo>. Those two used to be written out separately,
// and drifted: the pages were corrected to declare this Nepali-first site as
// ne_NP while the Worker kept saying en_US, and the Worker's head-stripping
// removed the site-wide twitter:site without putting it back. Both now come from
// the shared tag list in src/utils/seo.

// The shell the worker fetches is the pre-rendered homepage: it already carries
// baked-in head tags (including the site-wide twitter:site) that the worker must
// strip and replace — except twitter:site, which it must keep.
const INDEX_HTML =
  '<!doctype html><html><head>' +
  '<title>Jawafdehi</title>' +
  '<meta name="description" content="Home page" />' +
  '<meta property="og:title" content="Home page" />' +
  '<meta property="og:locale" content="ne_NP" />' +
  '<meta name="twitter:site" content="@jawafdehi" />' +
  '<meta name="twitter:title" content="Home page" />' +
  '<link rel="canonical" href="https://jawafdehi.org/" />' +
  '</head><body></body></html>';

// The raw template, as opposed to the pre-rendered shell above: the head is
// still placeholders. pre-render.ts substitutes helmet's own <title> element for
// the title marker, so the marker stands for a whole element, not bare text.
const TEMPLATE_HTML =
  '<!doctype html><html><head>' +
  '<meta name="twitter:site" content="@jawafdehi" />' +
  '<!--helmet-title-->' +
  '<!--helmet-meta-->' +
  '</head><body></body></html>';

function makeEnv(indexHtml: string = INDEX_HTML) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (path === '/') {
          return new Response(indexHtml, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        }
        return new Response('not found', { status: 404 });
      },
    },
  };
}

// A deliberately fictional municipality. Test data on this repo is Nepali, but
// a fixture asserting corruption must not name a real body: the allegation here
// is invented, and inventing one against a real entity is exactly what this
// project exists to avoid. The Devanagari is the point — it checks the case
// name survives the Worker's escaping into the share card unmangled.
const CASE_TITLE = 'नमुना नगरपालिका खरिद प्रकरण';

function stubCaseApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.includes('/cases/')) {
        return new Response(
          JSON.stringify({
            title: CASE_TITLE,
            slug: 'namuna-nagarpalika-kharid-prakaran',
            state: 'PUBLISHED',
            description: 'नमुना नगरपालिकाको खरिद प्रक्रियासम्बन्धी परीक्षण विवरण।',
            key_allegations: ['खरिद प्रक्रियामा अनियमितता भएको आरोप'],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('', { status: 404 });
    }),
  );
}

async function caseHead(indexHtml = INDEX_HTML): Promise<string> {
  const res = await worker.fetch(
    new Request('https://jawafdehi.org/case/some-case'),
    makeEnv(indexHtml),
  );
  return res.text();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker case-meta fallback: language and site handle', () => {
  it('declares the shared case page as Nepali-first', async () => {
    stubCaseApi();
    const html = await caseHead();

    expect(html).toContain('og:title');
    expect(html).toMatch(/<meta property="og:locale" content="ne_NP" \/>/);
    expect(html).toMatch(
      /<meta property="og:locale:alternate" content="en_US" \/>/,
    );
    expect(html).not.toContain('content="en_US" /><meta property="og:locale"');
  });

  it('emits exactly one og:locale and one canonical', async () => {
    stubCaseApi();
    const html = await caseHead();

    expect(html.match(/property="og:locale"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html.match(/<title>/g)).toHaveLength(1);
  });

  it('emits one title, and no bare title text, when the shell is the raw template', async () => {
    stubCaseApi();
    const html = await caseHead(TEMPLATE_HTML);
    const head = html.slice(0, html.indexOf('</head>'));

    expect(head).not.toContain('<!--helmet-title-->');
    expect(head).not.toContain('<!--helmet-meta-->');
    expect(head.match(/<title>/g)).toHaveLength(1);

    // Everything in a head is an element. Strip them all — including the title's
    // own text — and nothing should be left over. The title marker stands for a
    // whole <title> element (that is what pre-render.ts substitutes), so filling
    // it with bare text would strand the case name as loose text in the head,
    // which is what a scraper reads before it reaches the real element.
    const leftover = head
      .replace(/<title>[\s\S]*?<\/title>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
    expect(leftover).toBe('');
  });

  it('keeps the site-wide twitter:site while replacing the other twitter tags', async () => {
    stubCaseApi();
    const html = await caseHead();

    expect(html).toContain('<meta name="twitter:site" content="@jawafdehi" />');
    // The shell's own card copy is gone, replaced by the case's.
    expect(html).not.toContain('content="Home page"');
    expect(html).toContain('twitter:title');
  });

  it('carries the Nepali case name through to the share card intact', async () => {
    stubCaseApi();
    const html = await caseHead();

    // Devanagari is not escaped away or mojibaked on its way into the head.
    expect(html).toContain(`<title>${CASE_TITLE} | Jawafdehi</title>`);
    expect(html).toContain(`content="${CASE_TITLE} | Jawafdehi"`);
    expect(html).toContain('property="og:image:alt" content="नमुना नगरपालिका खरिद प्रकरण"');
    expect(html).not.toContain('&#');
  });
});
