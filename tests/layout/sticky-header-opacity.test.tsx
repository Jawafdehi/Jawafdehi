// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Navbar } from '@/components/Navbar';

// The header is `sticky top-0` and 76px tall, and it used to be `bg-transparent`
// at *every* scroll position: `isScrolled` only turned on backgrounds for the
// individual controls inside it (logo pill, search/menu buttons, language
// toggle). So the page scrolled directly behind the band and only those pills
// masked anything.
//
// Measured at eight real scroll positions on the home page, before the fix: zero
// full-width masks and page text under the header at every position but the top —
// worst case the hero headline "स्थायी अभिलेख" overlapping the band by 47px.
//
// This is worse on a phone than on desktop: a desktop header carries a full nav
// row that incidentally covers most of the band, while a 360px header has four
// small pills and mostly open space. Devanagari makes it worse again, because tall
// matras and conjuncts collide with the pill shapes.
//
// See docs/testing/mobile-audit-2026-08-16.md (S5c).

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

// Both pull in their own data/UI machinery and neither is what this is about.
vi.mock('@/components/AppSearchCommand', () => ({ AppSearchCommand: () => null }));
vi.mock('@/components/LanguageToggle', () => ({ LanguageToggle: () => null }));

function renderNavbar() {
  const { container } = render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
  const header = container.querySelector('header');
  expect(header, 'Navbar rendered no <header>').not.toBeNull();
  return header!;
}

/** Scroll past the 20px threshold Navbar watches, the way the browser would. */
function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: y, writable: true, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('the sticky header is opaque once scrolled', () => {
  afterEach(cleanup);

  it('is transparent at the top of the page, for the hero', () => {
    const header = renderNavbar();

    expect(
      header.className,
      'the header should stay transparent at rest so the hero reads as one surface',
    ).toContain('bg-transparent');
  });

  it('takes a background and a backdrop blur once scrolled', () => {
    const header = renderNavbar();
    scrollTo(240);

    expect(
      header.className,
      'the header is still transparent after scrolling, so page content reads ' +
        'straight through the band — only the control pills mask anything.',
    ).not.toContain('bg-transparent');
    expect(header.className, 'the scrolled header has no background').toMatch(/\bbg-background\//);
    expect(header.className, 'the scrolled header has no backdrop blur').toMatch(
      /\bbackdrop-blur/,
    );
  });

  it('goes back to transparent when scrolled to the top again', () => {
    const header = renderNavbar();
    scrollTo(240);
    scrollTo(0);

    expect(header.className).toContain('bg-transparent');
  });
});

describe('the skip link clears the sticky header', () => {
  // Same root cause, different symptom: 76px of sticky chrome that in-page jumps
  // do not know about. Without a scroll-margin the "skip to content" link — the
  // one control whose entire job is to get a keyboard user past the header —
  // parks the top of <main> underneath it.
  it('#main-content reserves the header height as scroll-margin', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/typography.css'), 'utf8');

    expect(
      css,
      '#main-content has no scroll-margin-top, so the skip link lands its own ' +
        'target under the 76px sticky header.',
    ).toMatch(/#main-content\s*\{[^}]*scroll-margin-top:\s*76px/);
  });

  it('is still the target the skip link points at', () => {
    const navbar = readFileSync(resolve(process.cwd(), 'src/components/Navbar.tsx'), 'utf8');

    expect(navbar, 'the skip link no longer points at #main-content').toContain('#main-content');
  });
});
