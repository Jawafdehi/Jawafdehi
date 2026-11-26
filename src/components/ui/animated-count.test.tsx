// SPDX-License-Identifier: Hippocratic-3.0
import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stand-in for react-countup that records every mount and every formattingFn
// identity it is handed: the real component restarts the count whenever
// formattingFn changes, so a new identity per render == a replayed animation.
const countUp = vi.hoisted(() => ({
  mounts: 0,
  formatters: new Set<unknown>(),
  onEnd: undefined as undefined | (() => void),
}));
vi.mock("react-countup", () => ({
  default: function MockCountUp(props: {
    end: number;
    formattingFn: (n: number) => string;
    onEnd?: () => void;
  }) {
    React.useEffect(() => {
      countUp.mounts += 1;
    }, []);
    countUp.formatters.add(props.formattingFn);
    countUp.onEnd = props.onEnd;
    return <span data-testid="counting">{props.formattingFn(0)}</span>;
  },
}));

import { AnimatedCount } from "./animated-count";

let trigger: (() => void) | undefined;

beforeEach(() => {
  countUp.mounts = 0;
  countUp.formatters.clear();
  countUp.onEnd = undefined;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private cb: IntersectionObserverCallback) {
        trigger = () => this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

// Each render hands AnimatedCount a fresh onEnd, as an inline-arrow parent would.
function Harness({ tick }: Readonly<{ tick: number }>) {
  return <AnimatedCount end={2926} onEnd={() => void tick} language="en" />;
}

describe("AnimatedCount", () => {
  it("keeps one formattingFn across re-renders so the count is not restarted", () => {
    const { rerender } = render(<Harness tick={0} />);
    act(() => trigger?.());
    rerender(<Harness tick={1} />);
    rerender(<Harness tick={2} />);
    expect(countUp.mounts).toBe(1);
    expect(countUp.formatters.size).toBe(1);
  });

  it("animates once, then stays static through later re-renders and new values", () => {
    const onEnd = vi.fn();
    const { rerender } = render(<AnimatedCount end={2926} onEnd={onEnd} language="en" />);
    act(() => trigger?.());
    expect(screen.getByTestId("counting")).toBeTruthy();

    act(() => countUp.onEnd?.());
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("counting")).toBeNull();
    expect(screen.getByText("2,926")).toBeTruthy();

    // A stats refetch with a new figure must not replay the count-up.
    rerender(<AnimatedCount end={2930} onEnd={onEnd} language="en" />);
    expect(screen.queryByTestId("counting")).toBeNull();
    expect(screen.getByText("2,930")).toBeTruthy();
    expect(countUp.mounts).toBe(1);
  });
});
