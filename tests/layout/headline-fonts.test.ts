// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PRESS_KIT_TYPEFACES } from '@/components/press-kit/constants';

// Headlines are pinned to one face per locale: Vesper Libre Bold under
// lang="ne", Inter under lang="en". Two things about that arrangement are
// invisible in review and regress silently — the page keeps working, it just
// pays for the wrong font or paints in the wrong one:
//
//  1. Which face index.html preloads. Only one is ever used per visit, so the
//     choice is made at runtime from the stored locale rather than by a static
//     link. A static Vesper link makes every English visitor fetch 65 KB
//     nothing renders while Inter arrives late; preloading both always wastes
//     one of them.
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

/** The one inline script in index.html — the font-preload chooser. */
function preloadScript(): string {
  const inline = INDEX_HTML.match(/<script>([\s\S]*?)<\/script>/);
  if (!inline) throw new Error('no inline <script> in index.html');
  return inline[1];
}

/**
 * Run the chooser with `i18nextLng` set to `stored` (null = never set, which is
 * the first-visit case) and return the href it preloads.
 */
function preloadedHref(stored: string | null): string | null | undefined {
  if (stored !== null) window.localStorage.setItem('i18nextLng', stored);
  new Function(preloadScript())();
  return document.head
    .querySelector<HTMLLinkElement>('link[rel="preload"][as="font"]')
    ?.getAttribute('href');
}

describe('the headline font preload in index.html', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.head.querySelectorAll('link[rel="preload"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preloads Vesper Libre Bold on a first visit', () => {
    // index.html ships lang="ne" and src/i18n/config.ts treats no stored
    // preference as Nepali, so the default path must match the default locale.
    expect(preloadedHref(null)).toBe(VESPER);
  });

  it('preloads Vesper Libre Bold for a reader who chose Nepali', () => {
    expect(preloadedHref('ne')).toBe(VESPER);
  });

  it('preloads Inter for a reader who chose English', () => {
    expect(preloadedHref('en')).toBe(INTER);
  });

  it('preloads Inter for a region-tagged English preference', () => {
    // i18next stores whatever changeLanguage() was given; config.ts matches on
    // the `en` prefix, and so must this.
    expect(preloadedHref('en-US')).toBe(INTER);
  });

  it('falls back to the Nepali default when storage is blocked', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });
    expect(() => new Function(preloadScript())()).not.toThrow();
    expect(
      document.head
        .querySelector<HTMLLinkElement>('link[rel="preload"][as="font"]')
        ?.getAttribute('href'),
    ).toBe(VESPER);
  });

  it('requests the font CORS-mode, so the browser does not fetch it twice', () => {
    preloadedHref(null);
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="preload"][as="font"]');
    expect(link?.getAttribute('crossorigin')).toBe('anonymous');
    expect(link?.getAttribute('type')).toBe('font/woff2');
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
