// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// iOS Safari zooms the whole page when a focused field's font-size is under 16px.
// index.html's viewport meta sets no `maximum-scale` (correctly — that would break
// pinch-zoom for everyone), so nothing suppresses it: tapping the archive search
// jumps and rescales the page. Measured 2026-08-16, 20 fields were under 16px,
// including all 9 on /report and every archive search box.
//
// Not reproducible in Chromium, and Playwright's Linux WebKit does not implement it
// either — it needs a real iPhone to observe. That is exactly why it needs a
// source-level gate: nothing else in CI can see it, and ~22-26% of Nepali mobile
// traffic is Safari/iOS.
//
// See docs/testing/mobile-audit-2026-08-16.md (S5).

const SRC = resolve(process.cwd(), 'src');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

// Admin and casework are internal, keyboard-and-mouse surfaces with dense tables
// (ProposalQueue runs at text-[11px]), and none of them is linked from a public
// page. They are exempt by intent, not by oversight — but the exemption is asserted
// below so that renaming a directory cannot silently widen it.
const EXEMPT_DIRS = ['pages/admin', 'components/admin', 'components/casework'];

/** Elements that take keyboard focus and so can trigger the iOS zoom. */
const FIELD_TAGS = ['input', 'textarea', 'select', 'Input', 'Textarea'];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

/**
 * The attribute span of every field open-tag in `source`.
 *
 * Deliberately not a regex: `[^>]*` — the obvious version — stops at the first `>`
 * in the tag, so any element with an arrow-function prop before its className is
 * invisible to it, and that is the common ordering in this codebase. This tracks
 * brace depth and quoting instead, so it reads the whole tag.
 */
function fieldTags(source: string): string[] {
  const spans: string[] = [];
  const open = new RegExp(`<(${FIELD_TAGS.join('|')})(?=[\\s/>])`, 'g');
  let m: RegExpExecArray | null;

  while ((m = open.exec(source))) {
    let depth = 0;
    let quote: string | null = null;
    let i = m.index + m[0].length;
    for (; i < source.length; i++) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') quote = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    spans.push(source.slice(m.index, i));
  }
  return spans;
}

/**
 * Sub-16px text utilities that are NOT behind a variant.
 *
 * The lookbehind is the point: `\btext-sm\b` also matches `sm:text-sm`, because
 * `:` is a non-word character and so satisfies `\b`. That would report the correct
 * responsive pattern as a violation. Excluding a preceding `:` (and `-`) means only
 * an unconditional utility is flagged.
 */
const UNGUARDED_SMALL = /(?<![\w:-])text-(?:xs|sm)\b|(?<![\w:-])text-\[(\d+(?:\.\d+)?)px\]/g;

function offendingSizes(tag: string): string[] {
  const hits: string[] = [];
  for (const m of tag.matchAll(UNGUARDED_SMALL)) {
    // An arbitrary value only offends if it is actually under 16px.
    if (m[1] !== undefined && Number(m[1]) >= 16) continue;
    hits.push(m[0]);
  }
  return hits;
}

describe('form fields are at least 16px on touch devices', () => {
  it('.font-input is 16px by default', () => {
    const css = read('styles/typography.css');
    const base = /\.font-input\s*\{([^}]*)\}/.exec(css);

    expect(base, 'no .font-input rule found in typography.css').not.toBeNull();
    expect(
      base![1],
      '.font-input is under 16px, so focusing any field zooms the page on iOS.',
    ).toMatch(/@apply[^;]*\btext-base\b/);
  });

  // The density override must not be keyed on width alone: iOS's focus zoom depends
  // on font-size, not orientation, and an iPhone SE in landscape is 667 CSS px
  // while an iPhone 14 is 844 — both past `sm`, both still zooming.
  it('drops to 14px only where there is a real pointer, not merely a wide screen', () => {
    const css = read('styles/typography.css');
    const override = /@media([^{]*)\{\s*\.font-input\s*\{([^}]*)\}/.exec(css);

    expect(override, '.font-input lost its density override').not.toBeNull();
    expect(override![2], 'the override no longer sets 14px').toMatch(/\btext-sm\b/);
    expect(
      override![1],
      'the 14px override is keyed on width alone, so a landscape phone (667px on ' +
        'an SE, 844px on an iPhone 14) gets 14px fields and still zooms on focus. ' +
        'Gate it on `any-hover: hover` as well.',
    ).toMatch(/any-hover:\s*hover|pointer:\s*fine/);
  });

  it('every exempt directory still exists', () => {
    for (const dir of EXEMPT_DIRS) {
      expect(existsSync(resolve(SRC, dir)), `exempt dir ${dir} is gone — the ` +
        `exemption below is now silently wider than intended`).toBe(true);
    }
  });

  // The rule above is only worth anything while fields actually use it. This is the
  // half that was missing: `.font-input` was described as the one place to fix, but
  // five fields set their size directly and never touched it — two of them on
  // public surfaces (/data-quality's court filters, and the document preview
  // reachable from /updates), so /data-quality still zoomed.
  it('no public field sets a sub-16px size directly', () => {
    const offenders: string[] = [];

    for (const file of tsxFiles(SRC)) {
      const rel = relative(SRC, file).replaceAll('\\', '/');
      if (EXEMPT_DIRS.some((dir) => rel.startsWith(`${dir}/`))) continue;

      for (const tag of fieldTags(readFileSync(file, 'utf8'))) {
        const hits = offendingSizes(tag);
        if (hits.length) {
          const name = /^<(\w+)/.exec(tag)?.[1] ?? '?';
          offenders.push(`${rel}: <${name}> has ${hits.join(', ')}`);
        }
      }
    }

    expect(
      offenders,
      'these focusable fields set a size under 16px unconditionally, so focusing ' +
        'one zooms the page on iOS. Use the `font-input` class (which is 16px on ' +
        'touch and 14px with a pointer) rather than a raw text-sm/text-xs.',
    ).toEqual([]);
  });
});
