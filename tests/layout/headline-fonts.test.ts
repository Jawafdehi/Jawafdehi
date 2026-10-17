// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import TAILWIND_CONFIG from '../../tailwind.config';
import { PRESS_KIT_TYPEFACES } from '@/components/press-kit/constants';

// Headlines are pinned to one face per locale: Vesper Libre Bold under
// lang="ne", Inter under lang="en". Two things about that arrangement are
// invisible in review and regress silently — the page keeps working, it just
// pays for the wrong font or paints in the wrong one:
//
//  1. Which face index.html preloads. First paint is decided by the
//     document's own `lang` — pre-rendered pages ship Nepali under lang="ne",
//     /research/corruption-accountability ships lang="en" — while the stored
//     preference takes over a frame later. Getting that split wrong is how a
//     visitor ends up with the face they do not paint in preloaded and the one
//     they do arriving late, which is the CLS regression PR #359 closed.
//  2. Where Noto Sans Devanagari sits in each stack. It is the Devanagari
//     guard, not a Latin fallback, so it belongs behind the system sans —
//     ahead of it, an English headline paints in Noto's Latin design for the
//     whole of Inter's `font-display: swap` window.
//
// Both are checked against the real files rather than a copy of them.

const ROOT = process.cwd();
const INDEX_HTML = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
// Comments stripped: several of them name the custom properties in prose.
const TYPOGRAPHY_CSS = readFileSync(resolve(ROOT, 'src/styles/typography.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

const VESPER = '/font/Vesper_Libre/VesperLibre-Bold.woff2';
const INTER = '/font/Inter/Inter-latin-wght.woff2';

/**
 * The font-preload chooser out of index.html, identified by what it does
 * rather than by being first — otherwise an inline stub added above it would
 * silently point every assertion below at the wrong code.
 */
function preloadScript(): string {
  const inline = [...INDEX_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .filter((source) => source.includes("'preload'"));
  if (inline.length !== 1) {
    throw new Error(`expected exactly 1 preload script in index.html, found ${inline.length}`);
  }
  return inline[0];
}

/**
 * Run the chooser against a document declaring `lang` — which is what decides
 * the painted face — with `i18nextLng` set to `stored` (null = never set,
 * which is the first-visit case). Returns the hrefs it preloads, in order.
 */
function preloadedHrefs(lang: string, stored: string | null = null): string[] {
  document.documentElement.lang = lang;
  if (stored !== null) window.localStorage.setItem('i18nextLng', stored);
  new Function(preloadScript())();
  return [
    ...document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="font"]'),
  ].map((link) => link.getAttribute('href') ?? '');
}

describe('the headline font preload in index.html', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.head.querySelectorAll('link[rel="preload"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preloads Vesper Libre Bold on a first visit', () => {
    // index.html ships lang="ne" and src/i18n/config.ts treats no stored
    // preference as Nepali, so the default path must match the default locale.
    expect(preloadedHrefs('ne')).toEqual([VESPER]);
  });

  it('preloads Vesper Libre Bold for a reader who chose Nepali', () => {
    expect(preloadedHrefs('ne', 'ne')).toEqual([VESPER]);
  });

  it('preloads both faces for a reader who chose English, painted face first', () => {
    // The pre-rendered markup is Nepali and paints in Vesper; config.ts flips
    // to English on the next frame and the rest of the session is Inter. Both
    // are really used, so dropping either one is a reflow somebody sees.
    expect(preloadedHrefs('ne', 'en')).toEqual([VESPER, INTER]);
  });

  it('treats a region-tagged English preference as English', () => {
    // i18next stores whatever changeLanguage() was given; config.ts matches on
    // the `en` prefix, and so must this.
    expect(preloadedHrefs('ne', 'en-US')).toEqual([VESPER, INTER]);
  });

  it('preloads Inter alone on an English-declared page', () => {
    // /research/corruption-accountability is served English-only and
    // pre-renders with lang="en" (ResearchCorruption.tsx, carried through by
    // scripts/pre-render.ts), so Vesper would be 65 KB it never paints.
    expect(preloadedHrefs('en')).toEqual([INTER]);
  });

  it('preloads Inter alone for an English reader on an English-declared page', () => {
    expect(preloadedHrefs('en', 'en')).toEqual([INTER]);
  });

  it('still covers the stored face on an English-declared page', () => {
    expect(preloadedHrefs('en', 'ne')).toEqual([INTER, VESPER]);
  });

  it('falls back to Nepali when the document declares no language', () => {
    expect(preloadedHrefs('')).toEqual([VESPER]);
  });

  it('falls back to the painted face when storage is blocked', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    document.documentElement.lang = 'ne';
    expect(() => new Function(preloadScript())()).not.toThrow();
    expect(
      [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="font"]')].map(
        (link) => link.getAttribute('href'),
      ),
    ).toEqual([VESPER]);
  });

  it('requests the font CORS-mode, so the browser does not fetch it twice', () => {
    preloadedHrefs('ne', 'en');
    const links = [
      ...document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="font"]'),
    ];
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.getAttribute('crossorigin')).toBe('anonymous');
      expect(link.getAttribute('type')).toBe('font/woff2');
    }
  });

  it('ships no static font preload that would fetch the unused face anyway', () => {
    const markup = INDEX_HTML.replace(/<!--[\s\S]*?-->/g, '').replace(
      /<script>[\s\S]*?<\/script>/g,
      '',
    );
    expect(markup).not.toMatch(/rel=["']preload["'][^>]*as=["']font["']/);
    expect(markup).not.toMatch(/as=["']font["'][^>]*rel=["']preload["']/);
  });

  it('preloads files that exist', () => {
    for (const href of [VESPER, INTER]) {
      expect(existsSync(resolve(ROOT, 'public', href.replace(/^\//, ''))), href).toBe(true);
    }
  });
});

/** The declared value of a custom property, whitespace-collapsed. */
function customProperty(css: string, name: string): string {
  const declaration = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!declaration) throw new Error(`${name} is not declared in this block`);
  return declaration[1].replace(/\s+/g, ' ').trim();
}

/** `[:root block, :root[lang="ne"] block]` of typography.css. */
function localeBlocks(): [string, string] {
  const nepali = TYPOGRAPHY_CSS.indexOf(':root[lang="ne"]');
  if (nepali < 0) throw new Error('no :root[lang="ne"] block in typography.css');
  return [TYPOGRAPHY_CSS.slice(0, nepali), TYPOGRAPHY_CSS.slice(nepali)];
}

/** Position of a family in a stack, by its index in the comma-separated list. */
function position(stack: string, family: string): number {
  return stack.split(',').findIndex((entry) => entry.replace(/["']/g, '').trim() === family);
}

describe('the headline font stacks', () => {
  const [english, nepali] = localeBlocks();

  it('leads with Inter in English and Vesper Libre in Nepali', () => {
    expect(position(customProperty(english, '--font-family-heading'), 'Inter')).toBe(0);
    expect(position(customProperty(nepali, '--font-family-heading'), 'Vesper Libre')).toBe(0);
  });

  it('keeps Noto behind the system faces in the English headline stack', () => {
    // Noto is the Devanagari guard, nothing more: Inter's unicode-range is
    // Latin-only, so per-character fallback reaches Noto for Devanagari
    // wherever it sits. Ahead of Helvetica/Arial it becomes the *Latin*
    // fallback too — and since the document ships lang="ne", Noto is already
    // loaded, so every English headline would paint in it during Inter's swap
    // window and stay there if Inter ever failed to load.
    const stack = customProperty(english, '--font-family-heading');
    const noto = position(stack, 'Noto Sans Devanagari');
    expect(noto, `Noto missing from ${stack}`).toBeGreaterThan(-1);
    for (const systemFace of ['Helvetica', 'Arial']) {
      expect(position(stack, systemFace), `${systemFace} in ${stack}`).toBeLessThan(noto);
    }
    // Last named family before the generic keyword — the same slot the app
    // face has given it all along.
    for (const property of ['--font-family-heading', '--font-family-app']) {
      const families = customProperty(english, property).split(',');
      expect(families.at(-2)?.replace(/["']/g, '').trim(), property).toBe(
        'Noto Sans Devanagari',
      );
      expect(families.at(-1)?.trim(), property).toBe('sans-serif');
    }
  });

  it('keeps Noto as the tofu guard in the Nepali headline stack', () => {
    // The mirror image: Vesper covers both scripts, so Noto is only there for
    // the codepoints it lacks — but it must stay ahead of Georgia, which has
    // no Devanagari at all.
    const stack = customProperty(nepali, '--font-family-heading');
    const noto = position(stack, 'Noto Sans Devanagari');
    expect(noto, `Noto missing from ${stack}`).toBeGreaterThan(-1);
    expect(position(stack, 'Georgia')).toBeGreaterThan(noto);
  });

  it('gives the press kit a Devanagari guard on every Devanagari sample', () => {
    // The press-kit cards pin an explicit family instead of riding
    // --font-family-heading, so they do not inherit the guard above.
    const devanagari = /[ऀ-ॿ]/;
    for (const face of PRESS_KIT_TYPEFACES) {
      if (!devanagari.test(face.sample) || !('family' in face)) continue;
      expect(position(face.family, 'Noto Sans Devanagari'), `${face.name}: ${face.family}`)
        .toBeGreaterThan(-1);
    }
  });
});

describe('the Tailwind family keys', () => {
  const extended = TAILWIND_CONFIG.theme.extend.fontFamily as Record<string, string[]>;

  it('are extended for every utility a press-kit card documents a face with', () => {
    // A card captioned with a face name and classed `font-<key>` shows
    // whatever that key resolves to. Unextended, `font-sans` is Tailwind's own
    // `ui-sans-serif, system-ui, …`, so the card captioned "Noto Sans
    // Devanagari" rendered in the visitor's OS UI font instead — a press kit
    // misrepresenting the face it exists to publish.
    for (const face of PRESS_KIT_TYPEFACES) {
      if (!('className' in face)) continue;
      const key = face.className.replace(/^font-/, '');
      expect(Object.keys(extended), `${face.name} is shown via .${face.className}`).toContain(key);
    }
  });

  it('route the locale-switching families through their custom properties', () => {
    // Not literal stacks: both switch per locale in src/styles/typography.css,
    // and a copy here is a second thing to keep in step.
    expect(extended.sans).toEqual(['var(--font-family-app)']);
    expect(extended.display).toEqual(['var(--font-family-heading)']);
  });
});
