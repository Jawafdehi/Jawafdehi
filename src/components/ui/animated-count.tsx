// SPDX-License-Identifier: Hippocratic-3.0
import * as React from "react";
import CountUp from "react-countup";

/**
 * A count-up figure that is already correct before it animates.
 *
 * `<CountUp end={n} />` on its own renders **nothing** on the server and a
 * literal `0` for the first frame on the client, for two separate reasons:
 *
 *  1. react-countup renders its value as the span's *children*, and those
 *     children are the `start` prop — with no `start` they are the empty string
 *     (`react-countup/build/index.js`: `typeof props.start !== 'undefined' ?
 *     … : ''`). So the pre-rendered HTML ships `<span></span>`.
 *  2. countup.js writes `startVal` into the element from its **constructor**
 *     (`countUp.js`: `if (this.el) { this.printValue(this.startVal) }`), and
 *     react-countup constructs on mount whatever `startOnMount` says. So every
 *     shape that animates up from zero displays a real `0` until it runs —
 *     including the render-prop form, and including `enableScrollSpy`, where
 *     that `0` persists until the element is scrolled into view.
 *
 * On this site those figures are counts of documented corruption cases, so a
 * placeholder `0` is a false claim rather than a missing one. Measured against
 * production on 2026-08-16, three of the four home hero figures shipped as empty
 * spans and stayed empty for ~6s on Slow 4G, because the 535 KB bundle has to
 * arrive before anything fills them in.
 *
 * So render the real figure as text, and only hand the element to CountUp when
 * a count-up would read as an effect rather than a glitch:
 *
 *  * no JS, or JS still loading  -> the true figure, crawlable and accessible;
 *  * prefers-reduced-motion     -> the true figure, never animated;
 *  * on screen at mount          -> animates 0 -> N immediately (the figure was
 *                                   never seen static, so nothing "resets");
 *  * below the fold at mount     -> the true figure holds until the element
 *                                   ENTERS the viewport, then counts 0 -> N.
 *
 * The scroll trigger fires via `rootMargin: 0px 0px -8% 0px` — i.e. as the
 * figure crosses into the bottom of the viewport, before a reader has dwelt on
 * it. (An earlier revision refused to animate anything below the fold at mount,
 * reasoning that a scroll-triggered reset to 0 reads as a glitch; that was
 * written when the hero stat band sat above the fold on desktop. The full-bleed
 * stage hero now puts the band below the fold everywhere, which turned "don't
 * re-animate" into "never animate". Triggering on entry keeps the original
 * concern honest — the reset happens before the figure has been read.)
 *
 * See docs/testing/mobile-audit-2026-08-16.md (S5b).
 */
export function AnimatedCount({
  end,
  display,
  duration = 0.9,
  separator = ",",
  decimals = 0,
  prefix,
  suffix,
  onEnd,
}: Readonly<{
  /** The number to count up to. */
  end: number;
  /**
   * What to show when not animating. Defaults to `end` rounded to a whole number
   * and grouped with `separator` — which is what countup.js itself renders at its
   * default `decimals: 0`, so the static text and the animated text agree.
   * Pass it explicitly when the caller already has the formatted string.
   */
  display?: string;
  duration?: number;
  separator?: string;
  /** Decimal places the animated figure keeps (countup.js `decimals`). */
  decimals?: number;
  /** Constant text before the animated figure, e.g. "Rs ". */
  prefix?: string;
  /** Constant text after the animated figure, e.g. " Kharab". */
  suffix?: string;
  /**
   * Fires when the count-up animation completes. Never fires when the figure
   * renders statically (SSR, reduced motion, never scrolled to) — callers using
   * it for finish flourishes get exactly that: no animation, no flourish.
   */
  onEnd?: () => void;
}>) {
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;
    // No observer (very old browser, or a DOM-less test) is not a failure mode
    // here: without one we simply keep showing the correct figure.
    if (!host || typeof IntersectionObserver === "undefined") return;

    // A count-up is pure motion; under prefers-reduced-motion the true figure
    // simply stays put. (matchMedia is feature-tested because jsdom lacks it.)
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    // Fires the moment the figure ENTERS the viewport (or immediately, if it is
    // already on screen at mount). The -8% bottom margin means it triggers as
    // the reader scrolls it in — before the static figure has been read — so
    // countup.js printing its startVal (0) reads as the animation starting, not
    // as a number the reader knew jumping backwards.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setAnimate(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  if (animate) {
    return (
      <CountUp
        end={end}
        duration={duration}
        separator={separator}
        decimals={decimals}
        prefix={prefix}
        suffix={suffix}
        onEnd={onEnd}
      />
    );
  }

  return (
    <span ref={hostRef}>
      {display ?? Math.round(end).toLocaleString("en-US").split(",").join(separator)}
    </span>
  );
}
