// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// A Sheet is `position: fixed` and Radix scroll-locks <body> while it is open. So
// if the panel's content is taller than the panel and nothing in the panel has a
// scrollport, that content is not "hard to reach" — it is unreachable. Measured on
// production 2026-08-16: the nav menu is 884px of content, which fits no common
// phone (even a 412x839 Pixel 7 is 45px short and loses one item); at 360x640 five
// items including Donate sat below the fold and mouse wheel, touch drag, Tab
// focus-scroll, scrollIntoView() and .click() all failed to bring them into view.
//
// The scrollport is a wrapper *inside* the panel rather than the panel itself,
// because the close button is `absolute` and the panel is its containing block: an
// absolutely-positioned descendant of a scroller belongs to that scroller's
// overflow region, so making the panel scroll pushed the X 248px above the
// viewport by the time Donate was reachable. Both halves are pinned below.
//
// jsdom does no layout, so this cannot assert scroll positions. What it can do —
// and what actually regresses — is pin the structure, as it is rendered rather than
// as it is authored.
//
// See docs/testing/mobile-audit-2026-08-16.md (S1).

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

function renderSheet(side: (typeof SIDES)[number], className?: string) {
  render(
    <Sheet open>
      <SheetContent side={side} className={className}>
        <SheetTitle>Menu</SheetTitle>
        <p>content</p>
      </SheetContent>
    </Sheet>,
  );
  const panel = document.querySelector('[role="dialog"]');
  expect(panel, `no dialog rendered for side="${side}"`).not.toBeNull();
  return panel as HTMLElement;
}

const classesOf = (el: Element) =>
  (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

/** The element that actually scrolls: the panel, or a descendant of it. */
function scrollportOf(panel: HTMLElement): HTMLElement | null {
  for (const el of [panel, ...Array.from(panel.querySelectorAll<HTMLElement>('*'))]) {
    if (classesOf(el).includes('overflow-y-auto')) return el;
  }
  return null;
}

describe('sheet content can always be scrolled', () => {
  afterEach(cleanup);

  for (const side of SIDES) {
    it(`side="${side}" has a vertical scrollport`, () => {
      const panel = renderSheet(side);
      const scrollport = scrollportOf(panel);

      expect(
        scrollport,
        `side="${side}" has nothing with overflow-y-auto: content taller than the ` +
          `panel becomes unreachable, because <body> is scroll-locked behind it.`,
      ).not.toBeNull();

      // Without this a flick that reaches the end of the scrollport chains to the
      // locked body and the panel appears frozen.
      expect(
        classesOf(scrollport!),
        `side="${side}" scrollport has no overscroll-contain: scrolling chains to ` +
          `the locked <body> at the end of the content.`,
      ).toContain('overscroll-contain');

      // overflow-y-auto only creates a scrollport if the box can be shorter than
      // its content. `min-h-0` is what permits that inside a flex column.
      expect(
        classesOf(scrollport!),
        `side="${side}" scrollport cannot shrink below its content, so ` +
          `overflow-y-auto is inert. It needs min-h-0.`,
      ).toContain('min-h-0');
    });

    it(`side="${side}" keeps the close button out of the scrollport`, () => {
      const panel = renderSheet(side);
      const scrollport = scrollportOf(panel);
      const close = panel.querySelector('button');

      expect(close, `side="${side}" rendered no close button`).not.toBeNull();
      expect(
        scrollport!.contains(close!),
        `side="${side}" puts the close button inside the scrollport. It is ` +
          `\`absolute\`, so it belongs to the scroller's overflow region and ` +
          `scrolls away with the content — measured 248px above the viewport by ` +
          `the time the nav's Donate was reachable.`,
      ).toBe(false);
    });
  }

  // The two axes constrain the panel differently, which is why this is not one
  // rule: left/right are pinned top-and-bottom by `inset-y-0` and sized with
  // `h-full`, while top/bottom size to their content and need an explicit ceiling.
  it('height-constrains every side, or the scrollport never engages', () => {
    for (const side of ['left', 'right'] as const) {
      expect(classesOf(renderSheet(side)), `side="${side}" lost its height`).toContain('h-full');
      cleanup();
    }
    for (const side of ['top', 'bottom'] as const) {
      expect(
        classesOf(renderSheet(side)).some((c) => /^max-h-/.test(c)),
        `side="${side}" has no max-height, so it grows past the viewport and the ` +
          `scrollport never engages.`,
      ).toBe(true);
      cleanup();
    }
  });

  // A consumer's className lands on the panel, and `cn()` is tailwind-merge — so
  // before the scrollport moved inside, `className="overflow-hidden"` was a live
  // way to re-break this from a call site. Pinned because it is the realistic one.
  it('a consumer class on the panel cannot remove the scrollport', () => {
    const panel = renderSheet('right', 'overflow-hidden');

    expect(classesOf(panel), 'tailwind-merge dropped the consumer class').toContain(
      'overflow-hidden',
    );
    expect(
      scrollportOf(panel),
      'a consumer passing overflow-hidden removed the scrollport, which is what ' +
        'putting it on the panel itself allowed.',
    ).not.toBeNull();
  });
});
