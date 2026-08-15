import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

// The rule: the hex is canonical and the HSL is derived from it, never the
// reverse — because hex → HSL → hex is lossy (#0E1F3B comes back as #0E1F3A).
//
// Held in both directions, and both are needed:
//   1. Nothing hardcodes a brand hex that disagrees with the one documented in
//      index.css. Catches the drift itself.
//   2. The documented hex still reproduces the token. Catches the opposite
//      repair — "correcting" the comment to the lossy value — which works
//      because the rounding is asymmetric: #0E1F3B → 62%, #0E1F3A → 61%.

const root = (p: string) => resolve(process.cwd(), p);
const INDEX_CSS = readFileSync(root('src/index.css'), 'utf8');
const INDEX_HTML = readFileSync(root('index.html'), 'utf8');
const MANIFEST = JSON.parse(readFileSync(root('public/site.webmanifest'), 'utf8'));

/** Every .ts/.tsx under a directory, recursively, as repo-relative paths. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root(dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/**
 * Remove comments, so prose that names a wrong hex in order to warn about it is
 * not itself reported. The line-comment pattern refuses a `//` preceded by `:`
 * so that a URL is not mistaken for the start of a comment.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/.*$/gm, '');
}

/** The hex documented in the comment attached to a CSS custom property. */
function documentedHex(token: string): string {
  // Either `--token: …; /* #RRGGBB */` on one line, or a block comment above it.
  const sameLine = new RegExp(`--${token}:[^;]+;\\s*/\\*[^*]*?(#[0-9A-Fa-f]{6})`).exec(INDEX_CSS);
  if (sameLine) return sameLine[1].toUpperCase();

  // Otherwise take the LAST hex before the declaration — the one in the comment
  // immediately above it. An earlier version searched forwards within a
  // 600-character window, which silently returned a *neighbouring* token's hex
  // as soon as the comment above this one got shorter than the window.
  const declaration = new RegExp(`--${token}\\s*:`).exec(INDEX_CSS);
  if (!declaration) throw new Error(`--${token} is not declared in src/index.css`);
  const preceding = [...INDEX_CSS.slice(0, declaration.index).matchAll(/#[0-9A-Fa-f]{6}/g)];
  const nearest = preceding.at(-1);
  if (!nearest) throw new Error(`no documented hex found for --${token} in src/index.css`);
  return nearest[0].toUpperCase();
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
    // Scans application source too, not just the two files that happened to be
    // wrong: a new #B5242C in a .tsx is the same defect and used to pass here.
    //
    // SVGs are excluded on purpose — a logo is a drawing, and its fills are part
    // of the artwork rather than a theme value. src/index.css is excluded because
    // it is where the canonical hex is documented.
    const offenders: string[] = [];

    const scan = (label: string, source: string, isAllowed: (hex: string) => boolean) => {
      for (const match of source.matchAll(/#(?:0E1F3[AB]|B[57]242C)/gi)) {
        if (!isAllowed(match[0].toUpperCase())) offenders.push(`${label}: ${match[0]}`);
      }
    };

    // Browser chrome may state the navy once each; both are asserted above
    // against the documented hex, so only a *different* brand hex is drift.
    scan('index.html', INDEX_HTML.replace(/<!--[\s\S]*?-->/g, ''), (hex) => hex === '#0E1F3B');
    scan('public/site.webmanifest', JSON.stringify(MANIFEST), (hex) => hex === '#0E1F3B');

    // Application source gets no exemption at all — every one of these has a token.
    for (const file of sourceFiles('src')) {
      scan(file, stripComments(readFileSync(root(file), 'utf8')), () => false);
    }

    expect(
      offenders,
      'hardcoded brand hex — use the token instead: hsl(var(--primary)), hsl(var(--accent))',
    ).toEqual([]);
  });
});
