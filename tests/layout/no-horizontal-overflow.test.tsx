// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { render } from '@testing-library/react';

import { DonationInfo } from '@/components/donate/info';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      // Return the Nepali string for the one key this test is about, so the
      // assertion is about a real localised label and not a short key name.
      key === 'donate.ways.us.paypal.cta'
        ? 'PayPal Giving Fund मार्फत आर्थिक सहयोग गर्नुहोस्'
        : typeof fallback === 'string'
          ? fallback
          : key,
  }),
}));

// Two routes rendered wider than the phone they were on, and Chromium hid both by
// scaling the page down and reporting the inflated innerWidth — so
// `scrollWidth > innerWidth`, the check everyone writes, returned 0. Measured on
// production and reproduced on a local build of `main`:
//
//     /report  @320/360/390   65px over, 20/18/17% zoomed out
//     /donate  @320/360/390   94/54/24px over, 29/15/6% zoomed out
//
// After these fixes the same measurement is 0px and 0% at every width. The
// regression gate is the Playwright overflow gate (tests/e2e-pw), which measures
// against the *requested* viewport width rather than innerWidth; what is worth
// pinning here is the two source-level mistakes, because both are invisible in
// review and neither looks wrong.
//
// See docs/testing/mobile-audit-2026-08-16.md (S2).

const SRC = resolve(process.cwd(), 'src');

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(full);
    return entry.isFile() && full.endsWith('.tsx') ? [full] : [];
  });
}

describe('the /donate CTA can wrap its Nepali label', () => {
  it('renders whitespace-normal, and tailwind-merge drops the base nowrap', () => {
    const { container } = render(<DonationInfo />);
    const cta = container.querySelector<HTMLAnchorElement>('a[href*="paypal"]');

    expect(cta, 'no PayPal CTA rendered').not.toBeNull();
    const classes = (cta!.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

    // `whitespace-nowrap` lives in the buttonVariants BASE string, so this is the
    // assertion that tailwind-merge actually resolved the conflict in our favour
    // — the equivalent trick does not work for `sr-only`, see the suite below.
    expect(
      classes,
      'the CTA is still whitespace-nowrap: its unbreakable Nepali label sets a ' +
        '350px min-content floor, which pushes the donate card to 398px and ' +
        'overflows a 320px phone by 94px.',
    ).not.toContain('whitespace-nowrap');
    expect(classes).toContain('whitespace-normal');

    // `w-fit` sizes the button to that label. Full width on phones, hug from sm up.
    expect(
      classes,
      'the CTA hugs its content at phone widths again — use `w-full sm:w-fit`.',
    ).not.toContain('w-fit');
    expect(classes).toContain('w-full');
    expect(classes).toContain('sm:w-fit');
  });
});

describe('sr-only is not applied to a styled control', () => {
  // `sr-only` sets width:1px;height:1px, and loses to any layout utility a
  // component's base string already carries: tailwind-merge keeps both (different
  // conflict groups) and Tailwind emits `.sr-only` first — measured in the built
  // stylesheet as rule 169, against `.h-10` at 324 and `.w-full` at 480. Equal
  // specificity, so the later rules win. The element then stays laid out at full
  // size, merely clipped, and an absolutely-positioned box still extends
  // scrollWidth. On /report that was the entire 65px, with `sr-only` present and
  // apparently doing its job. Reordering the className string changes nothing.
  const STYLED = ['Input', 'Textarea', 'Button', 'SelectTrigger'];
  const pattern = new RegExp(`<(${STYLED.join('|')})\\b[^>]*?className="[^"]*\\bsr-only\\b`, 's');

  it('has no <Input|Textarea|Button|SelectTrigger className="sr-only"> in src', () => {
    const offenders = tsxFiles(SRC)
      .filter((file) => pattern.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file));

    expect(
      offenders,
      'these hide a styled control with `sr-only`, which does not work: the ' +
        "component's own `w-full`/`h-10` win on stylesheet order and the field " +
        'stays laid out at full size. Use a plain <input>/<button> — a ' +
        'visually-hidden control needs no styling.',
    ).toEqual([]);
  });
});
