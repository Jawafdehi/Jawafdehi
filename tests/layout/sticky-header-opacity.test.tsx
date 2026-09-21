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

  it('masks the page once scrolled', () => {
    const header = renderNavbar();
    scrollTo(240);
    const classes = header.className.split(/\s+/).filter(Boolean);

    expect(
      classes,
      'the header is still transparent after scrolling, so page content reads ' +
        'straight through the band — only the control pills mask anything.',
    ).not.toContain('bg-transparent');

    // Unprefixed classes are what a phone gets; `md:`-prefixed ones are not.
    const phoneBg = classes.find((c) => /^bg-background(\/\d+)?$/.test(c));
    const phoneBlur = classes.some((c) => /^backdrop-blur/.test(c));

    expect(phoneBg, 'the scrolled header has no background at phone widths').toBeDefined();

    // The finding this encodes: a *translucent* band with no blur is not enough.
    // `bg-background/95` on its own still let the hero headline through as a sharp,
    // legible ghost — the blur had been diffusing the residual. So phones need one
    // or the other: fully opaque, or blurred.
    expect(
      phoneBg === 'bg-background' || phoneBlur,
      `the scrolled header is translucent (${phoneBg}) with no backdrop blur at ` +
        `phone widths, so page text still reads through it — and reads sharply, ` +
        `which is worse than the blurred version it replaced.`,
    ).toBe(true);
  });

  it('goes back to transparent when scrolled to the top again', () => {
    const header = renderNavbar();
    scrollTo(240);
    scrollTo(0);

    expect(header.className).toContain('bg-transparent');
  });
});

describe('the header is light-on-dark over the home hero', () => {
  // The home hero became a full-bleed navy stage. The at-rest header is
  // transparent directly on top of it, where the navy wordmark (logo.svg)
  // and navy nav text would be invisible. So on "/" only, the at-rest header
  // swaps to the light logo cut and light text, and snaps back to the normal
  // treatment the moment the opaque background arrives (isScrolled).
  afterEach(cleanup);

  function renderAt(path: string) {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <Navbar />
      </MemoryRouter>,
    );
    return container;
  }

  function logoTokens(container: HTMLElement) {
    const darkLogo = container.querySelector('img[src="/assets/logo-dark.svg"]');
    expect(darkLogo, 'the light logo cut is no longer rendered').not.toBeNull();
    return (darkLogo as HTMLElement).className.split(/\s+/).filter(Boolean);
  }

  it('shows the light logo cut at the top of the home page', () => {
    const tokens = logoTokens(renderAt('/'));

    expect(
      tokens,
      'at rest over the navy home hero the light logo must be visible — the navy wordmark vanishes',
    ).toContain('block');
    expect(tokens).not.toContain('hidden');
  });

  it('returns to the navy logo once scrolled onto the opaque light band', () => {
    const container = renderAt('/');
    scrollTo(240);

    expect(
      logoTokens(container),
      'scrolled, the header is an opaque light band — the light logo would vanish on it',
    ).toContain('hidden');
  });

  it('keeps the navy logo on pages that open on a light surface', () => {
    expect(logoTokens(renderAt('/about'))).toContain('hidden');
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
        'target under the sticky header.',
    ).toMatch(/#main-content\s*\{[^}]*scroll-margin-top:\s*\d+px/);
  });

  // The scroll-margin is only correct while it equals the header's height, and the
  // two live in different files. Compare the numbers rather than asserting a
  // literal, so changing `h-[76px]` fails here instead of silently re-breaking the
  // skip link — which is the whole point of this half of the change.
  //
  // NB: 76px is repeated in seven places already (page-hero, hero, both payment
  // pages, donate/info's scroll-mt, Navbar, and this CSS rule). Hoisting it to a
  // custom property would be the real fix; it is out of scope here, and this at
  // least pins the pair that has to agree.
  it('the scroll-margin still equals the header height', () => {
    const navbar = readFileSync(resolve(process.cwd(), 'src/components/Navbar.tsx'), 'utf8');
    const css = readFileSync(resolve(process.cwd(), 'src/styles/typography.css'), 'utf8');

    const header = /\bh-\[(\d+)px\]/.exec(navbar);
    const margin = /#main-content\s*\{[^}]*scroll-margin-top:\s*(\d+)px/.exec(css);

    expect(header, 'the header row no longer sets an explicit height').not.toBeNull();
    expect(margin, '#main-content has no scroll-margin-top').not.toBeNull();
    expect(
      Number(margin![1]),
      `the header is ${header![1]}px tall but #main-content reserves ` +
        `${margin![1]}px, so the skip link lands its target ` +
        `${Number(header![1]) - Number(margin![1])}px under the header.`,
    ).toBe(Number(header![1]));
  });

  it('is still the target the skip link points at', () => {
    const navbar = readFileSync(resolve(process.cwd(), 'src/components/Navbar.tsx'), 'utf8');

    expect(navbar, 'the skip link no longer points at #main-content').toContain('#main-content');
  });
});
