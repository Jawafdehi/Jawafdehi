// SPDX-License-Identifier: Hippocratic-3.0
//
// The notice's expiry is a hydration problem, not a timer problem, and these
// gates are about the difference. A shape that resolves the clock in an effect
// still passes "the bar is gone after the cutoff" — it just paints the bar
// first and removes it on the next frame, which is a visible flash on every
// hard load past the cutoff.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import {
  EVENT_POSTPONED_NOTICE_ENDS_AT,
  useEventPostponedNoticePast,
} from "@/lib/event-postponed";

/** Records the hook's value on every render pass, in order. */
function Probe({ passes }: { passes: boolean[] }) {
  passes.push(useEventPostponedNoticePast());
  return null;
}

function renderAt(when: string) {
  vi.setSystemTime(new Date(when));
  cleanup();
  const passes: boolean[] = [];
  render(<Probe passes={passes} />);
  return passes;
}

describe("useEventPostponedNoticePast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("knows the cutoff is past on its very first render pass", () => {
    const passes = renderAt("2026-09-03T01:00:01Z");

    expect(
      passes[0],
      "the first client render must already know the notice has expired. If " +
        "this is false the value arrives from an effect, which runs after " +
        "paint — the browser shows the stale bar for a frame before it is " +
        "removed, on every hard load, for every visitor.",
    ).toBe(true);
  });

  it("settles without a second render pass", () => {
    const passes = renderAt("2026-09-03T01:00:01Z");

    expect(
      new Set(passes).size,
      "the hook must not change value after mount. A false-then-true " +
        "sequence is the flash this guards against.",
    ).toBe(1);
  });

  it("still reports the notice live before the cutoff", () => {
    expect(renderAt("2026-08-30T12:00:00Z")[0]).toBe(false);
  });

  it("renders the notice live on the server, whatever the build clock says", () => {
    // The home route is prerendered. Baking a clock reading into the static
    // HTML would contradict the visitor's own clock at hydration, so the
    // server snapshot is unconditionally "live" and the client corrects it.
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const passes: boolean[] = [];
    renderToString(<Probe passes={passes} />);

    expect(passes[0]).toBe(false);
  });

  it("expires at 6:45 AM Nepal time on 3 September, when the session would have started", () => {
    expect(EVENT_POSTPONED_NOTICE_ENDS_AT).toBe(Date.parse("2026-09-03T01:00:00Z"));
  });
});
