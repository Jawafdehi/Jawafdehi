import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AccountabilityFunnel, type FunnelStage } from "@/components/data-quality/AccountabilityFunnel";

const ofLabel = (pct: string) => `${pct}% of complaints`;

/** The research page's funnel, trimmed to the two stages the range behaviour turns on. */
const stages: FunnelStage[] = [
  { key: "complaints", label: "Complaints", count: 28554, color: "hsl(var(--accent))" },
  { key: "convicted", label: "Convictions", count: 62, countUpper: 84, color: "hsl(var(--accent))" },
];

describe("AccountabilityFunnel range stages", () => {
  it("reads out a stage with an upper bound as a range, in counts and in share", () => {
    render(<AccountabilityFunnel stages={stages} denominator={28554} isLoading={false} ofLabel={ofLabel} />);

    expect(screen.getByText("62–84")).toBeTruthy();
    // 62/28,554 = 0.2%, 84/28,554 = 0.3% — the span the headline quotes.
    expect(screen.getByText("0.2–0.3% of complaints")).toBeTruthy();
  });

  it("leaves a stage without an upper bound as a single figure", () => {
    render(<AccountabilityFunnel stages={stages} denominator={28554} isLoading={false} ofLabel={ofLabel} />);

    expect(screen.getByText("28,554")).toBeTruthy();
    expect(screen.getByText("100% of complaints")).toBeTruthy();
  });

  it("never draws the band narrower than the solid fill it extends", () => {
    // Both ends clamp to the 0.8% hairline minimum down here, so the band is invisible at
    // this scale — but it must not invert, which is what a missing clamp on the upper end
    // would do. The numeric readout is what carries the range in the funnel's tail.
    const { container } = render(
      <AccountabilityFunnel stages={stages} denominator={28554} isLoading={false} ofLabel={ofLabel} />,
    );

    const bars = container.querySelectorAll<HTMLElement>("div.absolute.inset-y-0");
    expect(bars).toHaveLength(3); // complaints solid + convictions band + convictions solid
    const band = Number.parseFloat(bars[1].style.width);
    const solid = Number.parseFloat(bars[2].style.width);
    expect(band).toBeGreaterThanOrEqual(solid);
  });

  it("keeps a decimal below 10% so a sliver never rounds away to 0%", () => {
    render(
      <AccountabilityFunnel
        stages={[{ key: "filed", label: "Filed", count: 137, color: "hsl(var(--accent))" }]}
        denominator={28554}
        isLoading={false}
        ofLabel={ofLabel}
      />,
    );

    expect(screen.getByText("0.5% of complaints")).toBeTruthy();
  });
});
