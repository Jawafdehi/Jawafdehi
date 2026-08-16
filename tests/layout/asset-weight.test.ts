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

/** Width of a WebP, read from its header rather than by decoding it. */
function webpWidth(buf: Buffer): number {
  const chunk = buf.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') return 1 + buf.readUIntLE(24, 3); // extended (alpha/anim)
  if (chunk === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff; // simple lossy
  if (chunk === 'VP8L') return 1 + (buf.readUInt32LE(21) & 0x3fff); // lossless
  return 0;
}

/** Height of a WebP, same three chunk layouts. */
function webpHeight(buf: Buffer): number {
  const chunk = buf.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') return 1 + buf.readUIntLE(27, 3);
  if (chunk === 'VP8 ') return buf.readUInt16LE(28) & 0x3fff;
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return 1 + (((bits >> 14) & 0x3fff) | 0);
  }
  return 0;
}

/**
 * Shorter side of a PNG or JPEG, from its header. `object-cover` on a square box
 * crops to this, so it is the most pixels a square avatar can honestly carry.
 */
function shortestSide(buf: Buffer): number {
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return Math.min(buf.readUInt32BE(16), buf.readUInt32BE(20)); // PNG IHDR
  }
  // JPEG: walk the segment chain to the first SOF marker. Skip the standalone
  // markers (SOI, TEM, RSTn), which carry no length field, and DHT/DAC/DNL, whose
  // 0xC4/0xC8/0xCC codes sit inside the SOF range without being one.
  for (let i = 2; i < buf.length - 9; ) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return Math.min(buf.readUInt16BE(i + 5), buf.readUInt16BE(i + 7)); // height, width
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return 0;
}

describe('served font weight', () => {
  const css = readFileSync(resolve(SRC, 'index.css'), 'utf8');

  it('serves every self-hosted face as WOFF2', () => {
    const faces = css.split('@font-face').slice(1).map((f) => f.slice(0, f.indexOf('}')));
    expect(faces.length).toBeGreaterThan(0);
    // Every face declares exactly one source, and it is a WOFF2.
    expect(faces.filter((f) => !f.includes(".woff2') format('woff2')"))).toEqual([]);
  });

  it('keeps the app face under 200 KB — it is on every route and gates the home LCP', () => {
    const face = resolve(PUBLIC, 'font/Noto_Sans_Devanagari/NotoSansDevanagari-wght.woff2');
    expect(existsSync(face), `${face} missing — run scripts/fonts/build-webfonts.sh`).toBe(true);
    // ~147 KB as generated, from 329,700 on the wire as a brotli'd TTF. WOFF2 is
    // already brotli-compressed internally, so this IS the download size.
    //
    // A range, not an exact figure, and deliberately loose: the WOFF2 encoder is
    // not byte-reproducible — five runs on the same input gave 146,744-147,424
    // bytes with identical content. Asserting an exact size would be flaky, and
    // asserting byte-equality against the committed file would be worse.
    expect(statSync(face).size).toBeLessThan(200_000);
  });

  it('ships no TTF in public/, and references none', () => {
    // public/ is deployed. The TTFs were 1,307,048 bytes of it, reachable by
    // nothing: the app ships one `type="module"` bundle with no `nomodule` twin and
    // sets no `build.target`/`browserslist`, so Vite's default `'modules'` target
    // floors it at ~Chrome 87 / Safari 14 — four years past universal WOFF2. They
    // now live in scripts/fonts/sources/ as the regeneration input.
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      );
    expect(walk(resolve(PUBLIC, 'font')).filter((f) => f.endsWith('.ttf'))).toEqual([]);
    expect(css).not.toContain('.ttf');
    expect(existsSync(resolve(ROOT, 'scripts/fonts/sources'))).toBe(true);
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

  it('serves EVERY team avatar from this repo, as WebP, resolving on disk', () => {
    const team = readFileSync(resolve(SRC, 'data/team.ts'), 'utf8');
    const thumbs = [...team.matchAll(/thumb:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(thumbs.length).toBeGreaterThan(20);

    // No external host, for any member. Nine thumbs used to be hotlinked — five
    // from s3.jawafdehi.org and four from avatars.githubusercontent.com — which
    // meant a third of the page depended on two services this project does not
    // control, at whatever resolution they happened to serve, with no lazy loading
    // and no way to size them. They are now downloaded, capped and committed; see
    // scripts/images/build-optimized.py.
    //
    // Three others were spelled `https://jawafdehi.org/assets/...`: an absolute URL
    // to this site's OWN origin for a file sitting in public/, so they were fetched
    // from production even in local dev.
    expect(thumbs.filter((t) => !t.startsWith('/assets/teammembers/'))).toEqual([]);
    expect(thumbs.filter((t) => !t.endsWith('.webp'))).toEqual([]);
    expect(thumbs.filter((t) => !existsSync(join(PUBLIC, t)))).toEqual([]);
  });

  it('sizes every avatar at min(504, its source) — never upscaling, never over', () => {
    // `CSS box x DPR` is a CEILING, not a target. 9 of the 22 photographs are below
    // 504 on their short side — the four GitHub avatars cap at 400-460 whatever
    // `?s=` asks for, and one source is 200x188 — so forcing 504 makes the file
    // bigger AND the picture worse. nischal was being upscaled 2.68x.
    //
    // The expected width is derived from each SOURCE rather than listed here,
    // because a hard-coded 504 ceiling cannot catch an upscale: 504 IS the ceiling,
    // so a 188px photo blown up to exactly 504 satisfies it. Asked the wrong way,
    // this test passed on that exact sabotage.
    const out = resolve(PUBLIC, 'assets/teammembers');
    const src = resolve(ROOT, 'scripts/images/sources/teammembers');

    const wrong = readdirSync(out)
      .filter((n) => n.endsWith('.webp'))
      .map((name) => {
        const stem = name.replace(/\.webp$/, '');
        const source = readdirSync(src).find((f) => f.replace(/\.[^.]+$/, '') === stem);
        const shortSide = source ? shortestSide(readFileSync(join(src, source))) : 0;
        return {
          name,
          got: webpWidth(readFileSync(join(out, name))),
          want: Math.min(504, shortSide),
          source: source ?? 'MISSING',
        };
      })
      .filter((f) => f.got !== f.want);

    expect(wrong).toEqual([]);
  });

  it('resolves every generated asset this PR repointed a reference at', () => {
    // Nothing resolves a `public/` string reference at build time, so a typo here
    // 404s in silence. The team thumbs are covered above; these are the other four.
    const refs: Array<[string, string]> = [
      ['src/components/data-sources.tsx', '/assets/ciaa.webp'],
      ['src/components/data-sources.tsx', '/assets/cib.webp'],
      ['src/lib/case-images.ts', '/assets/placeholder.webp'],
      ['src/components/home/newsletter-signup-modal.tsx', '/favicon.png'],
    ];
    const broken = refs.filter(([file, ref]) => {
      const referenced = readFileSync(resolve(ROOT, file), 'utf8').includes(ref);
      return !referenced || !existsSync(join(PUBLIC, ref));
    });
    expect(broken).toEqual([]);
  });

  it('keeps the source logos at the 4:3 the JSX declares', () => {
    // build-optimized.py sizes these by HEIGHT with auto width, and
    // data-sources.tsx hardcodes width/height. A replacement source at a different
    // aspect ratio would leave the JSX declaring a wrong aspect box, and --check
    // would not notice: it re-derives dimensions from the source, not from the JSX.
    const jsx = readFileSync(resolve(SRC, 'components/data-sources.tsx'), 'utf8');
    const w = Number(/width=\{(\d+)\}/.exec(jsx)?.[1]);
    const h = Number(/height=\{(\d+)\}/.exec(jsx)?.[1]);
    const declared = w / h;
    for (const name of ['ciaa.webp', 'cib.webp']) {
      const buf = readFileSync(resolve(PUBLIC, 'assets', name));
      const actualW = webpWidth(buf);
      const actualH = webpHeight(buf);
      expect(
        Math.abs(actualW / actualH - declared),
        `${name} is ${actualW}x${actualH} (${(actualW / actualH).toFixed(3)}) but ` +
          `data-sources.tsx declares ${w}x${h} (${declared.toFixed(3)})`,
      ).toBeLessThan(0.02);
    }
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
  it('gives `size="icon"` a 2px tap ring — 44px on the default box — without moving it', () => {
    const button = readFileSync(resolve(SRC, 'components/ui/button.tsx'), 'utf8');
    const icon = /icon:\s*"([^"]*)"/.exec(button)?.[1] ?? '';
    // The painted box must stay 40 while the region that accepts the tap reaches
    // 44. `size="icon"` has 37 call sites in src/, several of them beside `h-10`
    // inputs and inside `h-10` rows, so growing the box would nudge layouts nobody
    // can review one by one. (The audit's "201 occurrences of 40x40" is rendered
    // instances across 7 viewports x 23 routes, not call sites.)
    expect(icon).toContain('h-10 w-10');
    // Without `relative` the pseudo-element positions against some ancestor and
    // the expansion lands somewhere else entirely.
    expect(icon).toContain('relative');
    // Without content the pseudo-element does not generate a box at all.
    expect(icon).toMatch(/after:content-\['']/);
    // A RELATIVE inset, not a fixed 44x44. A fixed size overflows by
    // `(44 - box) / 2` per edge, which grows as a call site shrinks the box — 4px
    // at h-9, 6px at h-8 — so the clearance a neighbour needs stops being a
    // constant and starts having to be recomputed per call site.
    expect(icon).toContain('after:-inset-[2px]');
    expect(icon).not.toMatch(/after:h-11|after:w-11/);
  });

  it('gives the two zero-gap segmented controls the clearance the ring needs', () => {
    // Both toggle groups put two `size="icon"` buttons flush against each other, so
    // without 4px between them one button's ring covers the other's PAINTED pixels
    // and a tap on a visible pixel activates the wrong control. Measured before the
    // gap: the last 2px of "grid view" on /cases and the last 4px of "card view" on
    // /search fired the list button.
    for (const [file, marker] of [
      ['pages/Cases.tsx', 'flex gap-1 border rounded-md'],
      ['pages/ArchiveSearch.tsx', 'flex items-center gap-1 rounded-full border p-0.5'],
    ]) {
      expect(readFileSync(resolve(SRC, file), 'utf8'), `${file} lost the toggle gap`).toContain(marker);
    }
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
