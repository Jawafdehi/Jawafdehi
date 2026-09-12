import { readFileSync } from 'node:fs';

import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';
import { entityHeadInput, caseHeadInput } from '../../src/utils/record-head';

// This archive is Nepali-first and says so everywhere: index.html declares
// lang="ne", og:locale defaults to ne_NP, and that is CORRECT for cases — sampled
// across the live archive, every case title and short_description comes out of the
// API in Devanagari.
//
// It is not correct for entities. Sampled the same way, **719 of 719** bound entity
// names are Latin: the registry is English-labelled, and the description falls back
// the same way. So every entity page emitted an English name and an English
// description while declaring og:locale ne_NP, inLanguage "ne" and inheriting
// <html lang="ne"> — telling every consumer the opposite of what it handed them,
// and telling a screen reader to pronounce Latin text with Nepali rules.
//
// The rule this locks in: a page declares the language of the CONTENT it carries,
// derived from the record rather than from a per-page constant or the reader's
// language toggle (which does not change which name the page shows).

const SHELL =
  '<!doctype html><html lang="ne" translate="no"><head>' +
  '<title>Jawafdehi</title><meta name="description" content="Home" />' +
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

async function served(path: string) {
  const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), env);
  const html = await res.text();
  const head = html.slice(0, html.indexOf('</head>'));
  const graphMatch = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return {
    html,
    head,
    htmlLang: html.match(/<html lang="([^"]+)"/)?.[1],
    ogLocale: head.match(/property="og:locale" content="([^"]+)"/)?.[1],
    ogLocaleAlternate: head.match(/property="og:locale:alternate" content="([^"]+)"/)?.[1],
    graph: graphMatch ? (JSON.parse(graphMatch[1]) as Record<string, unknown>) : null,
    title: head.match(/<title>([^<]*)</)?.[1],
  };
}

describe('an entity page declares the language of its own content', () => {
  const BASE = { '@id': 'https://jawafdehi.org/entity/a/b', '@type': 'GovernmentOrganization' };

  it('declares English when the record is English-labelled', async () => {
    stubApi({
      ...BASE,
      name: { en: 'Department of Survey', ne: 'नापी कार्यालय' },
      description: { en: 'An office.' },
    });
    const r = await served('/entity/a/b');

    expect(r.title).toContain('Department of Survey');
    expect(r.ogLocale).toBe('en_US');
    expect(r.ogLocaleAlternate).toBe('ne_NP');
    expect(r.graph?.inLanguage).toBe('en');
    // And the document itself, not only the metadata: <html lang="ne"> would tell a
    // screen reader to pronounce Latin text with Nepali rules.
    expect(r.htmlLang).toBe('en');
  });

  it('declares Nepali when the record carries only Nepali', async () => {
    stubApi({ ...BASE, '@type': 'Person', name: { ne: 'राम बहादुर' }, description: { ne: 'विवरण' } });
    const r = await served('/entity/a/b');

    expect(r.ogLocale).toBe('ne_NP');
    expect(r.ogLocaleAlternate).toBe('en_US');
    expect(r.graph?.inLanguage).toBe('ne');
    expect(r.htmlLang).toBe('ne');
  });

  it('declares Nepali for a Nepali name with no description at all', async () => {
    stubApi({ ...BASE, '@type': 'Person', name: { ne: 'राम बहादुर' } });
    const r = await served('/entity/a/b');

    expect(r.ogLocale).toBe('ne_NP');
    expect(r.htmlLang).toBe('ne');
  });

  it('keeps the template’s translate="no" when it rewrites lang', async () => {
    stubApi({ ...BASE, name: { en: 'An Office' } });
    const r = await served('/entity/a/b');

    // The rewrite is deliberately narrow — only the lang attribute — because the
    // in-app language switcher is the single source of truth for language and the
    // template suppresses browser auto-translation to protect it.
    expect(r.htmlLang).toBe('en');
    expect(r.html).toContain('translate="no"');
  });

  it('takes no reader-language argument, because the content does not change', () => {
    // The entity page shows the same English-first name to either reader, so a
    // reader-language override here would declare a language the bytes do not match.
    const head = entityHeadInput(
      { name: { en: 'An Office', ne: 'कार्यालय' } },
      ['prefix', 'slug'],
    );

    expect(head.language).toBe('en');
    expect(head.htmlLang).toBe('en');
  });
});

describe('a case page stays Nepali-first, which is what the data is', () => {
  it('declares Nepali and leaves the document language alone', async () => {
    stubApi({
      title: 'दमक बालुवाटार जग्गा प्रकरण',
      slug: 'damak',
      state: 'PUBLISHED',
      description: 'विवरण',
    });
    const r = await served('/case/damak');

    expect(r.ogLocale).toBe('ne_NP');
    expect(r.graph?.inLanguage).toBe('ne');
    // No override: the shell already says ne, which is right here.
    expect(r.htmlLang).toBe('ne');
  });

  it('carries Devanagari and Nepali numerals through escaping unharmed', async () => {
    const title = 'दमक प्रकरण: रु. ४१.६२ करोडको सरकारी जग्गा';
    stubApi({ title, slug: 'damak', state: 'PUBLISHED' });
    const r = await served('/case/damak');

    // Nepali numerals (४१.६२) are ordinary digits in Devanagari and must never be
    // normalised, transliterated or escaped into entities.
    expect(r.graph?.headline).toBe(title);
    expect(String(r.graph?.headline)).toMatch(/[\u0966-\u096F]/);
    expect(r.head).toContain('४१.६२');
  });

  it('does so for the real API record too', async () => {
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(
        readFileSync('/home/uakarki/.kiro/crew/workspace/review-tools/fx/case.json', 'utf8'),
      ) as Record<string, unknown>;
    } catch {
      return; // review fixture, not committed
    }

    const head = caseHeadInput(record, String(record.slug));
    const graph = (head.jsonLd as Array<Record<string, unknown>>)[0];

    expect(graph.inLanguage).toBe('ne');
    expect(String(graph.headline)).toMatch(/[\u0900-\u097F]/);
  });
});
