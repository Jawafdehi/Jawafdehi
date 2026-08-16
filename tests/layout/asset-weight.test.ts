// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Guards for the served-asset weight and the touch-target sizes, at the source
// level — because none of it is visible in review and all of it regresses the
// same way: somebody drops the original photograph back in, or pastes a
// `@font-face` that points at the TTF again.
//
// Every number here was measured, not chosen. /team weighed 5.67 MB fully
// scrolled at 360x640, of which 4.77 MB was 13 avatars rendered into a 112x112
// box; the app font cost 329,700 bytes on the wire on every route.
//
// The pixel budgets come from `CSS box x DPR`, with DPR 4.5 — the ratio
// `devices["Galaxy S9+"]` uses, which is what the phone gates in
// tests/e2e-pw/responsive.mobile.spec.ts run at. 3 is the number habit suggests
// and it is too low: at 336px the avatars measured a mean 1.95/255 difference
// against the original because the browser was stretching them to 504.

const ROOT = process.cwd();
const SRC = resolve(ROOT, 'src');
const PUBLIC = resolve(ROOT, 'public');

describe('served font weight', () => {
  const css = readFileSync(resolve(SRC, 'index.css'), 'utf8');

  it('serves every self-hosted face as WOFF2 before any TTF fallback', () => {
    // Order matters: a browser takes the FIRST `src` format it supports, so a TTF
    // listed first would be downloaded by everything and the WOFF2 never fetched.
    const faces = css.split('@font-face').slice(1);
    expect(faces.length).toBeGreaterThan(0);

    const wrong = faces
      .map((face) => face.slice(0, face.indexOf('}')))
      .filter((face) => face.includes('.ttf'))
      .filter((face) => face.indexOf('.woff2') === -1 || face.indexOf('.ttf') < face.indexOf('.woff2'))
      .map((face) => /url\('([^']+)'\)/.exec(face)?.[1] ?? face.slice(0, 60));

    expect(wrong).toEqual([]);
  });

  it('keeps the app face under 200 KB — it is on every route and gates the home LCP', () => {
    const face = resolve(PUBLIC, 'font/Noto_Sans_Devanagari/NotoSansDevanagari-wght.woff2');
    expect(existsSync(face), `${face} missing — run scripts/fonts/build-webfonts.sh`).toBe(true);
    // 147,468 as generated, from 329,700 on the wire as a brotli'd TTF. WOFF2 is
    // already brotli-compressed internally, so this IS the download size.
    expect(statSync(face).size).toBeLessThan(200_000);
  });

  it('does not reintroduce the width axis the app never uses', () => {
    // The upstream file carries `wght` AND `wdth`; nothing in src/ varies width,
    // and dropping that axis is 108 KB of the 182 KB saved. The generated name
    // records which axes survived, so a rebuild that kept both would be visible.
    expect(css).toContain('NotoSansDevanagari-wght.woff2');
    expect(css).not.toMatch(/url\('[^']*NotoSansDevanagari-VariableFont[^']*'\) format\('woff2'\)/);
  });
});

describe('served image weight', () => {
  it('keeps every team avatar under 80 KB', () => {
    const dir = resolve(PUBLIC, 'assets/teammembers');
    const heavy = readdirSync(dir)
      .map((name) => ({ name, size: statSync(join(dir, name)).size }))
      .filter((f) => f.size > 80_000);

    // anish.webp is the largest at ~70 KB (a busy background). The originals this
    // replaced ran to 1,752,924 bytes for a 112x112 box.
    expect(heavy).toEqual([]);
  });

  it('serves team avatars as WebP, and every local thumb resolves on disk', () => {
    const team = readFileSync(resolve(SRC, 'data/team.ts'), 'utf8');
    const thumbs = [...team.matchAll(/thumb:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(thumbs.length).toBeGreaterThan(10);

    const local = thumbs.filter((t) => t.startsWith('/'));
    // Three thumbs used to be spelled `https://jawafdehi.org/assets/...` — an
    // absolute URL to this site's own origin for a file sitting in public/. That
    // fetched them from production even in local dev, and would have 404'd the
    // moment the originals stopped being deployed. Note this must NOT match
    // `https://s3.jawafdehi.org/team/...`, which is a real external CDN and the
    // correct way to reference an asset this repo does not hold.
    expect(thumbs.filter((t) => /^https?:\/\/(www\.)?jawafdehi\.org\//.test(t))).toEqual([]);
    expect(local.filter((t) => !t.endsWith('.webp'))).toEqual([]);
    expect(local.filter((t) => !existsSync(join(PUBLIC, t)))).toEqual([]);
  });

  it('keeps the oversized originals out of public/, where they would be deployed', () => {
    // They stay in the repo as the regeneration input for
    // scripts/images/build-optimized.py — just not in the directory that ships.
    const dir = resolve(PUBLIC, 'assets/teammembers');
    const raster = readdirSync(dir).filter((n) => /\.(png|jpe?g)$/i.test(n));
    expect(raster).toEqual([]);
    expect(existsSync(resolve(ROOT, 'scripts/images/sources/teammembers'))).toBe(true);
  });
});

describe('touch target sizes', () => {
  it('gives `size="icon"` buttons a 44px tap region without moving the 40px box', () => {
    const button = readFileSync(resolve(SRC, 'components/ui/button.tsx'), 'utf8');
    const icon = /icon:\s*"([^"]*)"/.exec(button)?.[1] ?? '';
    // The painted box must stay 40 while the region that accepts the tap reaches
    // 44. `size="icon"` has 37 call sites in src/, several of them beside `h-10`
    // inputs and inside `h-10` rows, so growing the box would nudge layouts nobody
    // can review one by one. (The audit's "201 occurrences of 40x40" is rendered
    // instances across 7 viewports x 23 routes, not call sites.)
    expect(icon).toContain('h-10 w-10');
    expect(icon).toContain('after:h-11');
    expect(icon).toContain('after:w-11');
    // Without `relative` the pseudo-element positions against some ancestor and
    // the expansion lands somewhere else entirely.
    expect(icon).toContain('relative');
    // Without content the pseudo-element does not generate a box at all.
    expect(icon).toMatch(/after:content-\['']/);
  });

  it('keeps footer nav rows and social icons at 44px', () => {
    const footer = readFileSync(resolve(SRC, 'components/Footer.tsx'), 'utf8');
    expect(footer).toContain('min-h-11');
    expect(footer).not.toContain('min-h-9');
    // The social row is hand-rolled rather than a Button, so the `icon` variant
    // above does not reach it — it needs its own 44px.
    expect(footer).not.toMatch(/inline-flex h-10 w-10 items-center justify-center rounded-full border/);
  });

  it('gives the case-card entity rows a target taller than their 20px line box', () => {
    const card = readFileSync(resolve(SRC, 'components/CaseCard.tsx'), 'utf8');
    // These were the audit's only two genuine WCAG 2.5.8 AA failures: 20px-tall
    // links ~8px apart in the /search empty state.
    expect(card).toMatch(/block min-w-0 truncate rounded-sm py-1/);
  });
});
