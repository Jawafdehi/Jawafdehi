import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// An unfurler never runs the React app, so the head the Worker injects is the
// ONLY one it sees. That made the <Seo> fix in UpdateDetail.tsx invisible where
// it mattered: after WebP renditions shipped, production served
//
//   <meta property="og:image" content="…7b706e9b….webp">   (the 800x450 card)
//
// to every scraper, because this route builds its tags from `article.thumbnail`
// independently of the component. These pin the Worker's own choice.

const INDEX_HTML =
  '<!doctype html><html><head>' +
  '<title>Jawafdehi</title>' +
  '<meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />' +
  '<meta name="twitter:site" content="@jawafdehi" />' +
  '</head><body></body></html>';

const OG_IMAGE = 'https://s3.jawafdehi.org/case_uploads/aaa.fill-1200x630.jpg';
const CARD = 'https://s3.jawafdehi.org/case_uploads/bbb.fill-800x450.webp';

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

/** The worker fetches the article list with `fields=*`, so whatever the API
 *  exposes is present. `renditions` decides which of them this article has. */
function stubCmsApi(renditions: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.includes('/cms/v2/pages/')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                title: 'पशुपतिनाथको सुनको जलहरी प्रकरण',
                excerpt: 'परीक्षण विवरण।',
                date: '2026-08-11',
                meta: {
                  slug: 'pashupatinath-jalahari-gold-case',
                  first_published_at: '2026-08-11T08:12:37Z',
                },
                ...renditions,
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('', { status: 404 });
    }),
  );
}

async function updatesHead(renditions: Record<string, unknown>): Promise<string> {
  stubCmsApi(renditions);
  const res = await worker.fetch(
    new Request('https://jawafdehi.org/updates/pashupatinath-jalahari-gold-case'),
    makeEnv(),
  );
  return res.text();
}

function metaContent(html: string, property: string): string | null {
  const m = html.match(
    new RegExp(`<meta property="${property}" content="([^"]*)"`),
  );
  return m ? m[1] : null;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker og:image for /updates/:slug', () => {
  it('unfurls with the JPEG social rendition, not the WebP card', async () => {
    const html = await updatesHead({
      thumbnail: { url: CARD, alt: 'जलहरी', width: 800, height: 450 },
      og_image: { url: OG_IMAGE, alt: 'जलहरी', width: 1200, height: 630 },
    });

    expect(metaContent(html, 'og:image')).toBe(OG_IMAGE);
    expect(html).not.toContain(CARD);
  });

  it('publishes the social image dimensions so the first scrape renders it', async () => {
    const html = await updatesHead({
      thumbnail: { url: CARD, alt: 'जलहरी', width: 800, height: 450 },
      og_image: { url: OG_IMAGE, alt: 'जलहरी', width: 1200, height: 630 },
    });

    expect(metaContent(html, 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'og:image:height')).toBe('630');
  });

  it('falls back to the card rendition when the article has no og_image', async () => {
    // Wagtail generates renditions lazily, so an article can legitimately be
    // serving `thumbnail` before `og_image` has ever been requested.
    const html = await updatesHead({
      thumbnail: { url: CARD, alt: 'जलहरी', width: 800, height: 450 },
    });

    expect(metaContent(html, 'og:image')).toBe(CARD);
  });

  it('does not attach article dimensions to the site-wide fallback card', async () => {
    // An article with no image gets the static social card. buildHeadTags knows
    // that card's real size and supplies it; what must NOT happen is an
    // article's own width/height riding along on a URL that isn't its image.
    const html = await updatesHead({ thumbnail: null });

    expect(metaContent(html, 'og:image')).toContain('social-preview');
    expect(metaContent(html, 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'og:image:height')).toBe('630');
  });

  it('keeps the fallback card unmeasured by the article it replaced', async () => {
    // The subtle one: an article whose image URL is present but rejected by
    // previewImageUrl (e.g. it points at a page, not an image) falls back to the
    // card — and must not then claim the rejected image's dimensions.
    const html = await updatesHead({
      thumbnail: { url: 'https://portal.jawafdehi.org/admin/pages/9/', width: 640, height: 480 },
    });

    expect(metaContent(html, 'og:image')).toContain('social-preview');
    expect(metaContent(html, 'og:image:width')).not.toBe('640');
    expect(metaContent(html, 'og:image:height')).not.toBe('480');
  });
});
