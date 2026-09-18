// SPDX-License-Identifier: Hippocratic-3.0
//
// The bar's expiry is a hydration problem, not a timer problem, and these
// gates are about the difference. A shape that resolves the clock in an effect
// still passes "the bar is gone after the cutoff" — it just paints the bar
// first and removes it on the next frame, which is a visible flash on every
// hard load past the cutoff. Carried over from the postponement notice this
// replaces, where that flash was found in production.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { LAUNCH_EVENT_ENDS_AT, useLaunchEventPast } from "@/lib/launch-event";

/** Records the hook's value on every render pass, in order. */
function Probe({ passes }: { passes: boolean[] }) {
  passes.push(useLaunchEventPast());
  return null;
}

function renderAt(when: string) {
  vi.setSystemTime(new Date(when));
  cleanup();
  const passes: boolean[] = [];
  render(<Probe passes={passes} />);
  return passes;
}

describe("useLaunchEventPast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("knows the session is over on its very first render pass", () => {
    const passes = renderAt("2026-09-24T02:30:01Z");

    expect(
      passes[0],
      "the first client render must already know the session has finished. If " +
        "this is false the value arrives from an effect, which runs after " +
        "paint — the browser shows the stale bar for a frame before it is " +
        "removed, on every hard load, for every visitor.",
    ).toBe(true);
  });

  it("settles without a second render pass", () => {
    const passes = renderAt("2026-09-24T02:30:01Z");

    expect(
      new Set(passes).size,
      "the hook must not change value after mount. A false-then-true " +
        "sequence is the flash this guards against.",
    ).toBe(1);
  });

  it("still reports the launch upcoming before the cutoff", () => {
    expect(renderAt("2026-09-15T12:00:00Z")[0]).toBe(false);
  });

  it("renders the bar live on the server, whatever the build clock says", () => {
    // The home route is prerendered. Baking a clock reading into the static
    // HTML would contradict the visitor's own clock at hydration, so the
    // server snapshot is unconditionally "live" and the client corrects it.
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const passes: boolean[] = [];
    renderToString(<Probe passes={passes} />);

    expect(passes[0]).toBe(false);
  });

  it("expires when the session ends, 90 minutes after it starts", () => {
    expect(LAUNCH_EVENT_ENDS_AT).toBe(Date.parse("2026-09-24T02:30:00Z"));

    const start = Date.parse("2026-09-24T01:00:00Z");
    expect(LAUNCH_EVENT_ENDS_AT - start).toBe(90 * 60 * 1000);
  });
});
