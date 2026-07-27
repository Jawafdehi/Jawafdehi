import { describe, it, expect } from "vitest";

import { REPORT, verdictYearRates } from "@/data/research-corruption";

describe("verdictYearRates — corruption accountability over time", () => {
  const rates = verdictYearRates(REPORT.overTime.byVerdictYear);
  // Keyed by fiscal-year start (2069 = FY 2069/70).
  const byYear = Object.fromEntries(rates.map((r) => [r.year, r]));

  it("computes a high early full-conviction rate", () => {
    expect(Math.round(byYear[2069].convPct)).toBe(69); // 22 / 32
    expect(Math.round(byYear[2070].convPct)).toBe(86); // 67 / 78
  });

  it("captures the collapse in full-conviction rate in FY2078/79", () => {
    expect(Math.round(byYear[2078].convPct)).toBe(14); // 46 / 330
    expect(byYear[2081].convPct).toBeLessThan(byYear[2069].convPct);
  });

  it("has acquittals overtake convictions in the FY2078/79 and FY2080/81 spikes", () => {
    expect(byYear[2078].acqPct).toBeGreaterThan(byYear[2078].convPct);
    expect(byYear[2080].acqPct).toBeGreaterThan(byYear[2080].convPct);
  });

  it("shows core-graft conviction also collapsing — the decline is not only a mix shift", () => {
    expect(Math.round(byYear[2076].coreConvPct)).toBe(64); // 84 / 131
    expect(Math.round(byYear[2078].coreConvPct)).toBe(7); // 21 / 300
    expect(byYear[2078].coreConvPct).toBeLessThan(byYear[2076].coreConvPct);
  });

  it("shows the fake-credential share of the docket shrinking over time", () => {
    expect(Math.round(byYear[2069].fakeSharePct)).toBe(59); // 19 / 32
    expect(byYear[2080].fakeSharePct).toBeLessThan(10); // 26 / 496 ≈ 5.2%
  });

  it("reconciles cohort backlog to the known ongoing count", () => {
    const totalPending = REPORT.overTime.cohorts.reduce((s, c) => s + c.pending, 0);
    expect(totalPending).toBe(REPORT.outcome.ongoing); // 169
  });
});
