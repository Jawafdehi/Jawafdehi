import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

// The brand navy was live as two different hexes: src/index.css documented
// #0E1F3B on --primary and every logo SVG used it, while index.html's
// theme-color and site.webmanifest's theme_color said #0E1F3A. Nothing was
// wrong-looking about either — the two differ by one step of blue, ΔE2000 0.42,
// which no reviewer will ever catch by eye.
//
// The cause is that hex → HSL → hex is lossy, and #0E1F3B comes back as
// #0E1F3A. Someone converted the token to a hex and pasted the result.
//
// So the rule is: THE HEX IS CANONICAL AND THE HSL IS DERIVED FROM IT, never the
// reverse. This file holds that rule in both directions:
//
//   1. Every file that hardcodes a brand colour as a hex agrees with the hex
//      documented in index.css. Plain string comparison, no colour maths — this
//      is the assertion that fails on the drift that actually happened.
//   2. The documented hex, converted to HSL and rounded the way CSS writes it,
//      reproduces the token. That is the check that catches the opposite repair:
//      "correcting" the comment to the lossy value.
//
// (2) is what settled which hex was original, without asking the designer. The
// rounding is not symmetric: #0E1F3B → `217 62% 14%`, but #0E1F3A → `217 61%
// 14%`. Only one of them can have produced the 62% that has been in the CSS all
// along.

const root = (p: string) => resolve(process.cwd(), p);
const INDEX_CSS = readFileSync(root('src/index.css'), 'utf8');
const INDEX_HTML = readFileSync(root('index.html'), 'utf8');
const MANIFEST = JSON.parse(readFileSync(root('public/site.webmanifest'), 'utf8'));

/** The hex documented in the comment attached to a CSS custom property. */
function documentedHex(token: string): string {
  // Either `--token: …; /* #RRGGBB */` on one line, or a block comment above it
  // ending in `| #RRGGBB`.
  const sameLine = new RegExp(`--${token}:[^;]+;\\s*/\\*[^*]*?(#[0-9A-Fa-f]{6})`).exec(INDEX_CSS);
  if (sameLine) return sameLine[1].toUpperCase();
  const above = new RegExp(`(#[0-9A-Fa-f]{6})[\\s\\S]{0,600}?--${token}:`).exec(INDEX_CSS);
  if (!above) throw new Error(`no documented hex found for --${token} in src/index.css`);
  return above[1].toUpperCase();
}

/** The raw HSL triplet a token is set to, e.g. "217 62% 14%". */
function tokenValue(token: string): string {
  const match = new RegExp(`--${token}:\\s*([^;]+);`).exec(INDEX_CSS);
  if (!match) throw new Error(`no --${token} in src/index.css`);
  return match[1].trim();
}

/** `#RRGGBB` → the `H S% L%` string CSS would carry, rounded to integers. */
function hexToCssHsl(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = ((h * 60) % 360 + 360) % 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

describe('brand colour tokens', () => {
  it('documents a hex for the two brand colours', () => {
    // Guards the regexes: without a hex to compare against, everything below
    // would pass by finding nothing.
    expect(documentedHex('primary')).toBe('#0E1F3B');
    expect(documentedHex('accent')).toBe('#B5242C');
  });

  // Only the two brand colours. The other tokens are UI greys, and some carry a
  // one-decimal HSL (`60 23.1% 97.5%`) that integer rounding cannot reproduce —
  // which is fine, because nothing outside the CSS hardcodes them.
  it.each([
    ['primary', 'the navy'],
    ['accent', 'the crimson'],
  ])('--%s is derived from its documented hex, not the other way round (%s)', (token) => {
    expect(
      hexToCssHsl(documentedHex(token)),
      `--${token} does not match its own documented hex. If you are "fixing" ` +
        `the comment, stop: hex → HSL → hex is lossy, so the hex a converter ` +
        `hands back is not necessarily the one the token came from. The hex is ` +
        `canonical; re-derive the token from it.`,
    ).toBe(tokenValue(token));
  });

  it("index.html's theme-color is the brand navy", () => {
    const themeColor = /<meta\s+name="theme-color"\s+content="(#[0-9A-Fa-f]{6})"/.exec(INDEX_HTML);
    expect(themeColor, 'no theme-color meta in index.html').not.toBeNull();
    expect(themeColor![1].toUpperCase()).toBe(documentedHex('primary'));
  });

  it("site.webmanifest's theme_color is the brand navy", () => {
    expect(MANIFEST.theme_color.toUpperCase()).toBe(documentedHex('primary'));
  });

  it("site.webmanifest's background_color is the page background", () => {
    // Not a brand colour as such, but the same class of hardcoded duplicate: a
    // PWA splash screen that does not match the page it opens onto flashes.
    expect(MANIFEST.background_color.toUpperCase()).toBe(documentedHex('background'));
  });

  it('leaves no brand hex hardcoded outside the CSS and the logo files', () => {
    // SVGs are excluded on purpose: a logo is a drawing, and its fills are part
    // of the artwork rather than a theme value. Everything else should read a
    // token, so this list is expected to stay empty.
    const offenders: string[] = [];
    for (const [label, source] of [
      // Comments are stripped: they explain the drift and name the wrong hex to
      // do it, which is documentation rather than a value anything renders.
      ['index.html', INDEX_HTML.replace(/<!--[\s\S]*?-->/g, '')],
      ['public/site.webmanifest', JSON.stringify(MANIFEST)],
    ] as const) {
      for (const match of source.matchAll(/#(?:0E1F3[AB]|B[57]242C)/gi)) {
        // index.html's is the theme-color, already asserted above.
        if (label === 'index.html' && match[0].toUpperCase() === '#0E1F3B') continue;
        if (label === 'public/site.webmanifest' && match[0].toUpperCase() === '#0E1F3B') continue;
        offenders.push(`${label}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
