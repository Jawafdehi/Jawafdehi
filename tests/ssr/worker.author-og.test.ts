import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';

// Author pages had NO metadata fallback at all — unlike cases and updates, which
// the Worker fetches and injects for. /author/<slug> served the bare SPA shell,
// so every author unfurled as the site-wide banner with og:url pointing at the
// homepage, and the person's name appeared nowhere in the preview.
//
// A crawler never runs the React app, so the head this Worker injects is the only
// one it sees, and /assets/og/author/<slug>.jpg is the only image URL it will
// fetch. These pin both.

const INDEX_HTML =
  '<!doctype html><html><head>' +
  '<title>Jawafdehi</title>' +
  '<meta property="og:url" content="https://jawafdehi.org/" />' +
  '<meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />' +
  '<meta name="twitter:site" content="@jawafdehi" />' +
  '</head><body></body></html>';

const PROFILE = {
  slug: 'rujit-kafle',
  display_name: 'Rujit Kafle',
  name_ne: 'रुजित काफ्ले',
  title: 'Caseworker',
  photo_url: 'https://jawafdehi.org/assets/teammembers/rujit.webp',
  email: null,
  links: [],
  cases: [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }],
};

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

function urlOf(input: string | URL | Request): string {
  return typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
}

/** Stub the platform API: the profile JSON, and the rendered card bytes. */
function stubApi(
  options: {
    profileStatus?: number;
    profile?: unknown;
    cardStatus?: number;
    cardBody?: Uint8Array;
    cardThrows?: boolean;
  } = {},
) {
  const {
    profileStatus = 200,
    profile = PROFILE,
    cardStatus = 200,
    cardBody = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
    cardThrows = false,
  } = options;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = urlOf(input);
      if (url.includes('/og-card.jpg')) {
        if (cardThrows) throw new Error('upstream unreachable');
        return new Response(cardStatus === 200 ? cardBody : null, {
          status: cardStatus,
          headers: cardStatus === 200 ? { 'Content-Type': 'image/jpeg' } : {},
        });
      }
      if (url.includes('/api/authors/')) {
        return new Response(profileStatus === 200 ? JSON.stringify(profile) : null, {
          status: profileStatus,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('not found', { status: 404 });
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal('caches', {
    default: { match: async () => undefined, put: async () => undefined },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function headFor(path: string): Promise<string> {
  const response = await worker.fetch(
    new Request(`https://jawafdehi.org${path}`),
    makeEnv() as never,
  );
  return response.text();
}

describe('the author page head', () => {
  it('names the author in the title and og:title', async () => {
    stubApi();

    const html = await headFor('/author/rujit-kafle');

    expect(html).toContain('<title>Rujit Kafle | Jawafdehi</title>');
    expect(html).toContain(
      '<meta property="og:title" content="Rujit Kafle | Jawafdehi" />',
    );
  });

  it('points og:image at the composed card, never the raw headshot', async () => {
    // The headshot is a 504x504 WebP: unreliable on WhatsApp and LinkedIn, and
    // cropped to a band across the face in a summary_large_image card.
    stubApi();

    const html = await headFor('/author/rujit-kafle');

    expect(html).toContain(
      '<meta property="og:image" content="https://jawafdehi.org/assets/og/author/rujit-kafle.jpg" />',
    );
    expect(html).not.toContain('teammembers/rujit.webp');
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
  });

  it('sets og:url to the author page, not the homepage', async () => {
    // The shell ships og:url="https://jawafdehi.org/" — the bug that made every
    // author page claim to BE the homepage.
    stubApi();

    const html = await headFor('/author/rujit-kafle');

    expect(html).toContain(
      '<meta property="og:url" content="https://jawafdehi.org/author/rujit-kafle" />',
    );
    expect(html).not.toContain('<meta property="og:url" content="https://jawafdehi.org/" />');
  });

  it('is a profile, not an article', async () => {
    stubApi();

    const html = await headFor('/author/rujit-kafle');

    expect(html).toContain('<meta property="og:type" content="profile" />');
    // A person has no publication date.
    expect(html).not.toContain('article:published_time');
  });

  it('describes the page with the role and the case count', async () => {
    stubApi();

    const html = await headFor('/author/rujit-kafle');

    expect(html).toContain('Rujit Kafle — Caseworker at Jawafdehi Initiative. 3 documented cases.');
  });

  it('says "1 documented case" for a single case', async () => {
    stubApi({ profile: { ...PROFILE, cases: [{ slug: 'a' }] } });

    expect(await headFor('/author/rujit-kafle')).toContain('1 documented case.');
  });

  it('drops the role from the description when the profile has none', async () => {
    stubApi({ profile: { ...PROFILE, title: '' } });

    const html = await headFor('/author/rujit-kafle');

    expect(html).toContain('Rujit Kafle at Jawafdehi Initiative. 3 documented cases.');
  });

  it('omits the count entirely for an author with no cases', async () => {
    // Every roster member has a profile — one is created on first credit, and at
    // least one exists for someone who has not authored anything yet. "0
    // documented cases" reads as a reproach where the bare role does not.
    stubApi({ profile: { ...PROFILE, display_name: 'Gaurav Karki', cases: [] } });

    const html = await headFor('/author/gaurav-karki');

    expect(html).toContain('Gaurav Karki — Caseworker at Jawafdehi Initiative."');
    expect(html).not.toContain('0 documented');
  });

  it('leaves exactly one of each overridden tag', async () => {
    // The shell is the pre-rendered homepage with its own baked-in tags, so the
    // injected head has to REPLACE them rather than append beside them.
    stubApi();

    const html = await headFor('/author/rujit-kafle');

    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
    expect(html.match(/property="og:url"/g)).toHaveLength(1);
    // twitter:site is site-wide and must survive.
    expect(html).toContain('<meta name="twitter:site" content="@jawafdehi" />');
  });

  it('404s an unpublished or unknown author instead of serving a page', async () => {
    stubApi({ profileStatus: 404 });

    const response = await worker.fetch(
      new Request('https://jawafdehi.org/author/nobody'),
      makeEnv() as never,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('falls through to the shell when the API does not answer', async () => {
    // A slow backend must not deindex a live page.
    stubApi({ profileStatus: 500 });

    const response = await worker.fetch(
      new Request('https://jawafdehi.org/author/rujit-kafle'),
      makeEnv() as never,
    );

    expect(response.status).toBe(200);
  });
});

describe('the author card route', () => {
  it('serves the rendered card as an image, cached for a day', async () => {
    stubApi();

    const response = await worker.fetch(
      new Request('https://jawafdehi.org/assets/og/author/rujit-kafle.jpg'),
      makeEnv() as never,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('Cache-Control')).toContain('max-age=86400');
  });

  it('redirects to the site banner when the API cannot render', async () => {
    // An unfurler that gets a non-image for og:image shows NO image, which is
    // worse than a generic one. 503 is the API saying it has no text shaping.
    stubApi({ cardStatus: 503 });

    const response = await worker.fetch(
      new Request('https://jawafdehi.org/assets/og/author/rujit-kafle.jpg'),
      makeEnv() as never,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(
      'https://jawafdehi.org/assets/social-preview.png',
    );
    // Never cached: a slug can become real, and a 503 is transient.
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('redirects to the site banner when the API is unreachable', async () => {
    stubApi({ cardThrows: true });

    const response = await worker.fetch(
      new Request('https://jawafdehi.org/assets/og/author/rujit-kafle.jpg'),
      makeEnv() as never,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(
      'https://jawafdehi.org/assets/social-preview.png',
    );
  });

  it('rejects a non-GET', async () => {
    stubApi();

    const response = await worker.fetch(
      new Request('https://jawafdehi.org/assets/og/author/rujit-kafle.jpg', {
        method: 'POST',
      }),
      makeEnv() as never,
    );

    expect(response.status).toBe(405);
  });

  it('asks the API for the slug it was given, percent-decoded', async () => {
    stubApi();

    await worker.fetch(
      new Request('https://jawafdehi.org/assets/og/author/rujit-kafle.jpg'),
      makeEnv() as never,
    );

    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const requested = calls.map((call) => urlOf(call[0] as string));
    expect(requested).toContain(
      'https://api.jawafdehi.org/api/authors/rujit-kafle/og-card.jpg',
    );
  });
});
