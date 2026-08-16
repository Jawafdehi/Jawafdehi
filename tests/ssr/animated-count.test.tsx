// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, cleanup } from '@testing-library/react';

import { AnimatedCount } from '@/components/ui/animated-count';

// The home hero's headline figures are counts of documented corruption cases.
// Measured against production on 2026-08-16, three of the four shipped as
// `<span></span>` and stayed empty until the 535 KB bundle hydrated — ~6s on
// Slow 4G. See docs/testing/mobile-audit-2026-08-16.md (S5b).
//
// There are two independent ways for a count-up figure to display a wrong
// number, and fixing one does not fix the other, so both are pinned here:
//
//   1. SERVER      — react-countup renders its value as the span's *children*,
//                    and those children are the `start` prop. No `start` => the
//                    empty string.
//   2. FIRST FRAME — countup.js writes `startVal` from its constructor, and
//                    react-countup constructs on mount regardless of
//                    `startOnMount`. So a figure can server-render correctly and
//                    still flip to `0` the moment it hydrates. That is what makes
//                    the render-prop and `enableScrollSpy` shapes wrong for this
//                    use: the `0` persists until the element scrolls into view,
//                    which on a phone is not immediate.
//
// `0 documented cases` on a corruption archive is a false claim, not a missing
// one, so neither is acceptable and the static text has to be the real figure.
//
// NB: react-countup is deliberately NOT mocked. A sentinel mock renders the end
// value as text, which silently satisfies assertion 1 even when the component is
// reverted to a bare `<CountUp>` — measured, so this is a real trap and not a
// hypothetical one.

type IOEntryish = { isIntersecting: boolean };

/** Install an IntersectionObserver that reports `intersecting` once, on observe. */
function stubObserver(intersecting: boolean) {
  class FakeIO {
    private readonly cb: (entries: IOEntryish[]) => void;
    constructor(cb: (entries: IOEntryish[]) => void) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ isIntersecting: intersecting }]);
    }
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIO;
}

const HAD_IO = 'IntersectionObserver' in globalThis;

function dropObserver() {
  if (!HAD_IO) delete (globalThis as unknown as Record<string, unknown>).IntersectionObserver;
}

beforeEach(dropObserver);
afterEach(() => {
  cleanup();
  dropObserver();
});

describe('AnimatedCount', () => {
  it('server-renders the real figure, not an empty span', () => {
    const html = renderToString(<AnimatedCount end={82} display="82" />);

    expect(html, `server-rendered an empty element: ${html}`).toContain('82');
    expect(html, 'server-rendered a placeholder 0, which is a false figure').not.toMatch(/>0</);
  });

  it('groups a bare number when the caller has no formatted string', () => {
    expect(renderToString(<AnimatedCount end={2245189} />)).toContain('2,245,189');
  });

  it('still shows the real figure after mount while off screen', () => {
    stubObserver(false);
    const { container } = render(<AnimatedCount end={82} display="82" />);

    expect(
      container.textContent,
      'an off-screen counter replaced the real figure — that is the countup.js ' +
        'constructor writing startVal, and it is what makes the render-prop and ' +
        'enableScrollSpy shapes unusable here.',
    ).toBe('82');
  });

  it('still shows the real figure when there is no IntersectionObserver at all', () => {
    dropObserver();
    const { container } = render(<AnimatedCount end={82} display="82" />);

    expect(container.textContent).toBe('82');
  });

  it('hands the element to CountUp once the figure is on screen', () => {
    stubObserver(true);
    const { container } = render(<AnimatedCount end={82} display="82" />);

    // CountUp owns the node from here, and counts up from 0 — so the one thing
    // that must be true is that the static text is no longer what is rendered.
    // Asserting the exact frame would be a race with requestAnimationFrame.
    expect(
      container.textContent,
      'the counter never animates: it should hand the element to CountUp when it ' +
        'scrolls into view.',
    ).not.toBe('82');
  });
});

describe('why AnimatedCount exists', () => {
  // If this ever fails, react-countup has started server-rendering its value and
  // AnimatedCount's static branch may be simplifiable. It is not a regression.
  it('bare react-countup server-renders an empty span', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('react-countup');
    const RealCountUp = (actual.default ?? actual) as React.ComponentType<{
      end: number;
      duration?: number;
      separator?: string;
    }>;

    // react-countup calls useLayoutEffect unconditionally, so rendering it on the
    // server warns once per hook. That is a fair description of the problem, but
    // it is not this suite's output to spend, so keep it out of the log.
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    let html: string;
    try {
      html = renderToString(<RealCountUp end={82} duration={0.9} separator="," />);
    } finally {
      warn.mockRestore();
    }

    expect(html, `react-countup now emits ${html} — see the note above`).not.toContain('82');
  });
});
