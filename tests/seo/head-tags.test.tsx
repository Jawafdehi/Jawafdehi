import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';

import { Seo } from '@/components/Seo';
import {
  buildHeadTags,
  renderHeadTagsToHtml,
  SOCIAL_IMAGE_URL,
  type HeadTagInput,
} from '@/utils/seo';

// The share metadata for a page is one list (buildHeadTags) rendered two ways:
// as react-helmet children by <Seo>, and as an HTML string by worker.ts for
// social scrapers. These tests pin the list and, most importantly, prove the two
// renderers still agree — the drift this refactor removed was exactly a tag
// present in one renderer and missing from the other.

const BASE: HeadTagInput = {
  title: 'Volunteer with Us — Jawafdehi',
  description: 'Join Jawafdehi as a volunteer.',
  canonicalUrl: 'https://jawafdehi.org/volunteer/',
};

// These tests run under jsdom, where react-helmet-async sees a DOM and writes
// tags to document.head instead of the server context. The pre-render and the
// Worker both run without a DOM, so opt into that path to test what ships.
beforeAll(() => {
  HelmetProvider.canUseDOM = false;
});
afterAll(() => {
  HelmetProvider.canUseDOM = true;
});

function tagPairs(input: HeadTagInput): string[] {
  return buildHeadTags(input).map((tag) =>
    tag.kind === 'title'
      ? `title=${tag.content}`
      : tag.kind === 'meta'
        ? `${tag.key}=${tag.content}`
        : `link:${tag.rel}=${tag.href}`,
  );
}

// Render <Seo> the way the app does and read back what helmet put in the head.
function renderSeoHead(props: HeadTagInput): string {
  const context: { helmet?: HelmetServerState } = {};
  renderToStaticMarkup(
    <HelmetProvider context={context}>
      <Seo {...props} />
    </HelmetProvider>,
  );
  const helmet = context.helmet;
  return [
    helmet?.title.toString(),
    helmet?.meta.toString(),
    helmet?.link.toString(),
  ].join('');
}

describe('buildHeadTags', () => {
  it('emits the canonical, Open Graph and Twitter set for a static page', () => {
    const keys = tagPairs(BASE);

    expect(keys).toContain('title=Volunteer with Us — Jawafdehi');
    expect(keys).toContain('og:title=Volunteer with Us — Jawafdehi');
    expect(keys).toContain('twitter:title=Volunteer with Us — Jawafdehi');
    expect(keys).toContain('og:description=Join Jawafdehi as a volunteer.');
    expect(keys).toContain('twitter:description=Join Jawafdehi as a volunteer.');
    expect(keys).toContain('link:canonical=https://jawafdehi.org/volunteer/');
    expect(keys).toContain('og:url=https://jawafdehi.org/volunteer/');
    expect(keys).toContain('twitter:card=summary_large_image');
    expect(keys).toContain('og:type=website');
  });

  it('is Nepali-first, and names English as the alternate', () => {
    expect(tagPairs(BASE)).toEqual(
      expect.arrayContaining(['og:locale=ne_NP', 'og:locale:alternate=en_US']),
    );
    // A page that translates its own copy follows the reader's language.
    expect(tagPairs({ ...BASE, language: 'en' })).toEqual(
      expect.arrayContaining(['og:locale=en_US', 'og:locale:alternate=ne_NP']),
    );
  });

  it('emits exactly one og:locale', () => {
    const locales = buildHeadTags({ ...BASE, language: 'ne' }).filter(
      (tag) => tag.kind === 'meta' && tag.key === 'og:locale',
    );
    expect(locales).toHaveLength(1);
  });

  it('claims image dimensions only for the image whose size we know', () => {
    // The site social card is a known 1200x630...
    expect(tagPairs(BASE)).toEqual(
      expect.arrayContaining(['og:image:width=1200', 'og:image:height=630']),
    );

    // ...but a case banner or CMS image arrives at an arbitrary size, so
    // claiming a ratio for it would hand scrapers a wrong one.
    const withBanner = tagPairs({
      ...BASE,
      imageUrl: 'https://portal.jawafdehi.org/media/case-banner.jpg',
    });
    expect(withBanner).toEqual(
      expect.arrayContaining([
        'og:image=https://portal.jawafdehi.org/media/case-banner.jpg',
      ]),
    );
    expect(withBanner.some((key) => key.startsWith('og:image:width'))).toBe(false);
    expect(withBanner.some((key) => key.startsWith('og:image:height'))).toBe(false);
  });

  it('carries article dates and tags only for an article', () => {
    const keys = tagPairs({
      ...BASE,
      type: 'article',
      publishedTime: '2026-01-02T03:04:05Z',
      modifiedTime: '2026-02-03T04:05:06Z',
      tags: ['ciaa', 'procurement'],
    });

    expect(keys).toContain('og:type=article');
    expect(keys).toContain('article:published_time=2026-01-02T03:04:05Z');
    expect(keys).toContain('article:modified_time=2026-02-03T04:05:06Z');
    expect(keys).toContain('article:tag=ciaa');
    expect(keys).toContain('article:tag=procurement');

    // A page with no dates emits no empty article: tags.
    expect(tagPairs(BASE).some((key) => key.startsWith('article:'))).toBe(false);
  });

  it('emits robots only when a record is unlisted', () => {
    expect(tagPairs(BASE).some((key) => key.startsWith('robots='))).toBe(false);
    expect(tagPairs({ ...BASE, robots: 'noindex, nofollow' })).toContain(
      'robots=noindex, nofollow',
    );
  });

  it('falls back to the site social card', () => {
    expect(tagPairs(BASE)).toContain(`og:image=${SOCIAL_IMAGE_URL}`);
  });

  it('lets a page describe itself differently to a scraper than to a search engine', () => {
    const keys = tagPairs({ ...BASE, socialDescription: 'Short share blurb.' });
    expect(keys).toContain('description=Join Jawafdehi as a volunteer.');
    expect(keys).toContain('og:description=Short share blurb.');
    expect(keys).toContain('twitter:description=Short share blurb.');
  });
});

describe('renderHeadTagsToHtml', () => {
  it('escapes values so an injected title cannot break out of the head', () => {
    const html = renderHeadTagsToHtml(
      buildHeadTags({
        ...BASE,
        title: '"><script>alert(1)</script>',
      }),
    );

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('<Seo> and the worker renderer', () => {
  const CASES: Array<[string, HeadTagInput]> = [
    ['a static page', BASE],
    [
      'an article with dates and tags',
      {
        ...BASE,
        type: 'article',
        imageUrl: 'https://portal.jawafdehi.org/media/case-banner.jpg',
        imageAlt: 'A case banner',
        publishedTime: '2026-01-02T03:04:05Z',
        modifiedTime: '2026-02-03T04:05:06Z',
        tags: ['ciaa'],
      },
    ],
    ['an unlisted record', { ...BASE, robots: 'noindex, nofollow' }],
  ];

  // The refactor's core promise: the head a scraper gets from the edge is the
  // head the app renders. If someone adds a tag to one renderer only, this fails.
  it.each(CASES)('agree on %s', (_name, input) => {
    const head = renderSeoHead(input);

    for (const tag of buildHeadTags(input)) {
      if (tag.kind === 'meta') {
        expect(head).toContain(`content="${tag.content}"`);
        expect(head).toContain(tag.key);
      } else if (tag.kind === 'link') {
        expect(head).toContain(tag.href);
      } else {
        expect(head).toContain(tag.content);
      }
    }
  });

  it('renders page-specific children alongside the shared tags', () => {
    const context: { helmet?: HelmetServerState } = {};
    renderToStaticMarkup(
      <HelmetProvider context={context}>
        <Seo {...BASE}>
          <link rel="alternate" type="application/json" href="https://api.jawafdehi.org/api/cases/1/" />
        </Seo>
      </HelmetProvider>,
    );

    const links = context.helmet?.link.toString() ?? '';
    expect(links).toContain('https://jawafdehi.org/volunteer/');
    expect(links).toContain('https://api.jawafdehi.org/api/cases/1/');
  });
});
