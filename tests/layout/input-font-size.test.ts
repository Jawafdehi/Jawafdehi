// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// iOS Safari zooms the whole page when a focused field's font-size is under
// 16px. index.html's viewport meta sets no `maximum-scale` (correctly — that
// would break pinch-zoom for everyone), so nothing suppresses it: tapping the
// archive search jumps and rescales the page. Measured 2026-08-16, 20 fields were
// under 16px, including all 9 on /report and every archive search box.
//
// This is not reproducible in Chromium, and Playwright's Linux WebKit does not
// implement it either — it needs a real iPhone to observe. That is exactly why it
// needs a source-level gate: nothing else in CI can see it, and ~22-26% of Nepali
// mobile traffic is Safari/iOS.
//
// See docs/testing/mobile-audit-2026-08-16.md (S5).

const SRC = resolve(process.cwd(), 'src');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

/** Tailwind sizes that are under 16px, and so unsafe on a focusable field. */
const SUB_16_UTILITIES = /\b(?:text-xs|text-sm)\b/;

describe('form fields are at least 16px on phones', () => {
  it('.font-input is 16px by default and only drops to 14px from sm up', () => {
    const css = read('styles/typography.css');

    const base = /\.font-input\s*\{([^}]*)\}/.exec(css);
    expect(base, 'no .font-input rule found in typography.css').not.toBeNull();

    expect(
      base![1],
      '.font-input is under 16px, so focusing any field zooms the page on iOS. ' +
        'Use `text-base` here and put `text-sm` behind a min-width media query.',
    ).toMatch(/@apply[^;]*\btext-base\b/);

    // The desktop density is deliberate, so pin that it is still scoped to a
    // breakpoint rather than applying everywhere.
    expect(
      css,
      '.font-input lost its sm override — desktop controls should stay at 14px.',
    ).toMatch(/@media\s*\(min-width:\s*640px\)\s*\{\s*\.font-input\s*\{[^}]*\btext-sm\b/);
  });

  // The rule above is only worth anything while the fields actually use it. Each
  // of these renders a focusable text field, and a raw `text-sm` in the base
  // class string would beat `.font-input` — same specificity, later in the
  // stylesheet.
  for (const file of ['components/ui/input.tsx', 'components/ui/textarea.tsx']) {
    it(`${file} sizes its text through .font-input`, () => {
      const source = read(file);

      expect(source, `${file} no longer applies font-input`).toContain('font-input');
      expect(
        SUB_16_UTILITIES.exec(source.replace(/file:text-sm/g, ''))?.[0],
        `${file} sets a sub-16px size directly, which overrides .font-input and ` +
          `re-introduces the iOS focus zoom.`,
      ).toBeUndefined();
    });
  }
});
