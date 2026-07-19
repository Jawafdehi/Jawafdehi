import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ConvictionByCharge, type ChargeRow } from "@/components/research/ConvictionByCharge";

// 643 / (643 + 5 + 80) = 88% convicted; 6 / (6 + 38 + 86) = 4.6% -> 5% rounded.
const rows: ChargeRow[] = [
  { label: "Fake credential", sublabel: "नक्कली प्रमाण पत्र", convicted: 643, partial: 5, acquitted: 80 },
  { label: "Illegal benefit", sublabel: "गैरकानुनी लाभ", convicted: 6, partial: 38, acquitted: 86 },
];

describe("ConvictionByCharge", () => {
  it("renders each charge with its conviction rate and legend", () => {
    render(
      <ConvictionByCharge
        rows={rows}
        avgPct={46}
        seriesLabels={{ convicted: "Convicted", partial: "Partial", acquitted: "Acquitted" }}
        avgLabel="46% court average"
      />,
    );

    // Labels (and their bilingual sublabels) render.
    expect(screen.getByText("Fake credential")).toBeTruthy();
    expect(screen.getByText("नक्कली प्रमाण पत्र")).toBeTruthy();

    // The conviction-rate column shows the computed rate.
    expect(screen.getAllByText("88%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5%").length).toBeGreaterThan(0);

    // Legend carries identity (never colour-alone).
    expect(screen.getByText("Convicted")).toBeTruthy();
    expect(screen.getByText("Acquitted")).toBeTruthy();
    expect(screen.getByText("46% court average")).toBeTruthy();
  });
});
