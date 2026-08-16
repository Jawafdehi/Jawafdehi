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
 * So render the real figure as text, and only hand the element to CountUp once
 * it is actually on screen:
 *
 *  * no JS, or JS still loading  -> the true figure, crawlable and accessible;
 *  * on screen                   -> animates, exactly as before;
 *  * below the fold              -> stays the true figure until scrolled to,
 *                                   which on a phone is the common case (the
 *                                   hero band sits at y=592 in a 640px viewport,
 *                                   so a mount-time animation is spent before a
 *                                   thumb can ever reach it).
 *
 * See docs/testing/mobile-audit-2026-08-16.md (S5b).
 */
export function AnimatedCount({
  end,
  display,
  duration = 0.9,
  separator = ",",
}: Readonly<{
  /** The number to count up to. */
  end: number;
  /**
   * What to show before the animation starts. Defaults to `end` grouped with
   * `separator`; pass it explicitly when the caller already has the formatted
   * string, so the static text and the animated text agree exactly.
   */
  display?: string;
  duration?: number;
  separator?: string;
}>) {
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    if (animate) return;
    const host = hostRef.current;
    // No observer (very old browser, or a DOM-less test) is not a failure mode
    // here: without one we simply keep showing the correct figure.
    if (!host || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setAnimate(true);
          observer.disconnect();
        }
      },
      // Start a touch before the figure is flush with the edge, so the animation
      // is not half over by the time it is comfortably readable.
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [animate]);

  if (animate) {
    return <CountUp end={end} duration={duration} separator={separator} />;
  }

  // `en-US` grouping, to match countup.js's own default formatting.
  return <span ref={hostRef}>{display ?? end.toLocaleString("en-US")}</span>;
}
