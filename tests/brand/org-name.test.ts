import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { SITE_NAME, SITE_NAME_NEPALI } from '../../src/utils/seo';

// The organisation was called six different things at once: "Jawafdehi Nepal" in
// SITE_NAME and the English footer, "Jawafdehi Initiative" on YouTube, LinkedIn,
// TikTok and Linktree, "Jawafdehi | जवाफदेही" on X, "Jawafdehi.org" on Discord,
// bare "Jawafdehi" in several <title> tags, and "जवाफदेही नेपाल" in the Nepali
// footer. Settled 2026-08-11: Jawafdehi Initiative, everywhere.
//
// One constant is only half the fix. The reason six spellings could coexist is
// that thirteen files wrote the name as a literal, so centralising it does not
// stop the next one. This asserts nothing hardcodes it again.

const ROOT = resolve(process.cwd());
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** Every .ts/.tsx under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe('the organisation has one name', () => {
  it('is Jawafdehi Initiative, in both scripts', () => {
    expect(SITE_NAME).toBe('Jawafdehi Initiative');
    // Board consensus 2026-07-01: दीर्घ ही, श not सि, भ not व. The certificate of
    // incorporation was corrected to match.
    expect(SITE_NAME_NEPALI).toBe('जवाफदेही इनिशिएटिभ');
  });

  it('appears nowhere as a hardcoded literal in the source', () => {
    // "Jawafdehi Nepal" was the old value. Any reappearance is a regression:
    // a name in a title or a description must come from SITE_NAME.
    const offenders: string[] = [];
    for (const file of [...sourceFiles('src'), 'worker.ts']) {
      const source = read(file);
      // Skip this test and the module that legitimately defines the names.
      if (file === 'src/utils/seo.ts') continue;
      for (const match of source.matchAll(/"[^"]*Jawafdehi Nepal[^"]*"|'[^']*Jawafdehi Nepal[^']*'/g)) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(
      offenders,
      'these hardcode the old organisation name — use SITE_NAME from @/utils/seo',
    ).toEqual([]);
  });

  it('is not hardcoded in either locale file', () => {
    for (const locale of ['en', 'ne'] as const) {
      const source = read(`src/i18n/locales/${locale}.json`);
      expect(source, `${locale}.json still says "Jawafdehi Nepal"`).not.toContain('Jawafdehi Nepal');
    }
  });

  // footer.copyright is currently referenced by nothing — the rendered footer
  // ends at the CC BY-NC line and carries no © notice at all. The key is kept
  // correct anyway, so that wiring it up later cannot reintroduce a name that
  // was retired, and this is the assertion that keeps it that way.
  it('uses the standard name in the (unrendered) footer copyright key', () => {
    const en = JSON.parse(read('src/i18n/locales/en.json'));
    const ne = JSON.parse(read('src/i18n/locales/ne.json'));
    expect(en.footer.copyright).toContain(SITE_NAME);
    expect(ne.footer.copyright).toContain(SITE_NAME_NEPALI);
  });

  it('does not name the pre-rename organisation anywhere', () => {
    // "Public Accountability Platform" was the name before Jawafdehi. It
    // survived in the i18n README's worked example, which is where a developer
    // copies a pattern from.
    const offenders: string[] = [];
    for (const file of [
      ...sourceFiles('src'),
      'worker.ts',
      'src/i18n/README.md',
      'src/i18n/locales/en.json',
      'src/i18n/locales/ne.json',
    ]) {
      if (read(file).includes('Public Accountability Platform')) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  // The reason this file is careful rather than a search-and-replace.
  //
  // "जवाफदेही नेपाल" occurs inside ordinary Nepali prose where it is not the
  // organisation's name: "जवाफदेही नेपालीहरूद्वारा निर्मित" is "built by
  // Nepalis", and "जवाफदेही नेपाल र विश्वभर" is "in Nepal and worldwide". A bulk
  // replace would have produced "जवाफदेही इनिशिएटिभीहरूद्वारा" — a word that does
  // not exist. Same class of trap as जवाफदेहिता, the ordinary noun for
  // accountability, which must never be "corrected" to जवाफदेही.
  it('leaves Nepali prose that merely contains the name intact', () => {
    const ne = JSON.parse(read('src/i18n/locales/ne.json'));
    expect(ne.home.mission.description).toContain('जवाफदेही नेपालीहरूद्वारा');
    expect(ne.donate.community.description).toContain('जवाफदेही नेपाल र विश्वभर');
  });

  it('never bulk-replaces जवाफदेहिता, the ordinary noun', () => {
    // Accountability-the-word, not the organisation. If a replace ever ate it,
    // the string would read जवाफदेहीता, which is a misspelling.
    for (const locale of ['en', 'ne'] as const) {
      const source = read(`src/i18n/locales/${locale}.json`);
      expect(source, `${locale}.json contains जवाफदेहीता`).not.toContain('जवाफदेहीता');
    }
  });

  it('gives the homepage JSON-LD the Nepali name as an alternate', () => {
    // schema.org's alternateName is the one identity field with room for it.
    const source = read('src/pages/Index.tsx');
    expect(source).toContain('"name": SITE_NAME');
    expect(source).toContain('"alternateName": [SITE_NAME_NEPALI');
  });
});
