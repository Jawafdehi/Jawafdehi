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
 * animating from zero would not contradict something the reader can already see:
 *
 *  * no JS, or JS still loading  -> the true figure, crawlable and accessible;
 *  * on screen at mount          -> animates 0 -> N, exactly as it always did
 *                                   (the desktop case: the hero band is above the
 *                                   fold there);
 *  * below the fold at mount     -> stays the true figure, and never animates.
 *
 * That last case is a deliberate trade, not an oversight. Triggering the animation
 * on scroll instead would mean a figure the reader has already read jumping
 * BACKWARDS to 0 — countup.js prints `startVal` from its constructor — which reads
 * as a glitch rather than an effect. And there is little to give up: the phone hero
 * band sits at document y=592 in a 640px viewport, so a 0.9s animation was already
 * over before a thumb could reach it.
 *
 * See docs/testing/mobile-audit-2026-08-16.md (S5b).
 */
export function AnimatedCount({
  end,
  display,
  duration = 0.9,
  separator = ",",
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
  /**
   * Fires when the count-up animation completes. Never fires when the figure
   * renders statically (SSR, below the fold at mount) — callers using it for
   * finish flourishes get exactly that: no animation, no flourish.
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

    // Deliberately a ONE-SHOT check of where the figure is at mount, not a
    // scroll-triggered trigger. countup.js prints `startVal` (0) from its
    // constructor, so handing it a figure that is already on screen and already
    // reading correctly makes the number jump BACKWARDS to 0 before counting up —
    // which reads as a glitch, not an animation.
    //
    // So: visible at mount (the desktop case, where the hero band is above the
    // fold) animates 0 -> N exactly as it always did. Below the fold, the figure
    // simply stays correct and never animates — and it was never watched anyway,
    // since the band sits at document y=592 in a 640px viewport and a 0.9s
    // animation is long spent before a thumb arrives.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setAnimate(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  if (animate) {
    return <CountUp end={end} duration={duration} separator={separator} onEnd={onEnd} />;
  }

  return (
    <span ref={hostRef}>
      {display ?? Math.round(end).toLocaleString("en-US").split(",").join(separator)}
    </span>
  );
}
