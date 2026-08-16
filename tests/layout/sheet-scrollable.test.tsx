// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

// A Sheet is `position: fixed` and Radix scroll-locks <body> while it is open.
// So if the panel's content is taller than the panel and the panel itself has no
// scrollport, that content is not "hard to reach" — it is unreachable. Measured
// on production 2026-08-16: the nav menu is 884px of content, which fits a
// 412x839 Pixel 7 and no smaller phone; at 360x640 five items including Donate
// sat below the fold and mouse wheel, touch drag, Tab focus-scroll,
// scrollIntoView() and .click() all failed to bring them into view.
//
// jsdom does no layout, so this cannot assert scroll positions. What it can do —
// and what actually regresses — is pin the declarations that make a scrollport
// exist, on every side, as they are rendered rather than as they are authored:
// the class string that ships is `cva` output run through tailwind-merge, so
// reading src/components/ui/sheet.tsx is not the same as reading what mounts.
//
// See docs/testing/mobile-audit-2026-08-16.md (S1).

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/** Classes actually rendered onto the panel for a given side. */
function panelClasses(side: (typeof SIDES)[number]): string[] {
  render(
    <Sheet open>
      <SheetContent side={side}>
        <SheetTitle>Menu</SheetTitle>
        <p>content</p>
      </SheetContent>
    </Sheet>,
  );
  const panel = document.querySelector('[role="dialog"]');
  expect(panel, `no dialog rendered for side="${side}"`).not.toBeNull();
  return (panel!.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
}

describe('sheet panels can always be scrolled', () => {
  afterEach(cleanup);

  for (const side of SIDES) {
    it(`side="${side}" establishes a vertical scrollport`, () => {
      const classes = panelClasses(side);

      // Without this the panel cannot scroll at all.
      expect(
        classes,
        `side="${side}" has no overflow-y-auto: content taller than the panel ` +
          `becomes unreachable, because <body> is scroll-locked behind it.`,
      ).toContain('overflow-y-auto');

      // Without this a flick that reaches the end of the panel chains to the
      // locked body and the panel appears frozen.
      expect(
        classes,
        `side="${side}" has no overscroll-contain: scrolling chains to the ` +
          `locked <body> at the end of the panel.`,
      ).toContain('overscroll-contain');
    });
  }

  // overflow-y-auto only creates a scrollport if the box is height-constrained.
  // The two axes constrain it differently, which is why this is not one rule:
  // left/right are pinned top-and-bottom by `inset-y-0` and sized with `h-full`,
  // while top/bottom size to their content and need an explicit ceiling.
  it('height-constrains every side, or overflow-y-auto is inert', () => {
    for (const side of ['left', 'right'] as const) {
      expect(panelClasses(side), `side="${side}" lost its height`).toContain('h-full');
      cleanup();
    }
    for (const side of ['top', 'bottom'] as const) {
      expect(
        panelClasses(side).some((c) => /^max-h-/.test(c)),
        `side="${side}" has no max-height, so it grows past the viewport and ` +
          `overflow-y-auto never engages.`,
      ).toBe(true);
      cleanup();
    }
  });
});
