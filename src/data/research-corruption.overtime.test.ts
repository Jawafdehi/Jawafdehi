import { describe, it, expect } from "vitest";

import { REPORT, verdictYearRates } from "@/data/research-corruption";

describe("verdictYearRates — corruption accountability over time", () => {
  const rates = verdictYearRates(REPORT.overTime.byVerdictYear);
  const byYear = Object.fromEntries(rates.map((r) => [r.year, r]));

  it("computes the early full-conviction rate near three-quarters", () => {
    expect(Math.round(byYear[2069].convPct)).toBe(76); // 59 / 78
    expect(Math.round(byYear[2070].convPct)).toBe(75); // 84 / 112
  });

  it("captures the recent collapse in full-conviction rate", () => {
    expect(Math.round(byYear[2079].convPct)).toBe(22); // 91 / 422
    expect(byYear[2081].convPct).toBeLessThan(byYear[2069].convPct);
  });

  it("has acquittals overtake convictions from BS 2078 on", () => {
    expect(byYear[2078].acqPct).toBeGreaterThan(byYear[2078].convPct);
    expect(byYear[2079].acqPct).toBeGreaterThan(byYear[2079].convPct);
  });

  it("shows core-graft conviction also falling — the decline is not only a mix shift", () => {
    expect(Math.round(byYear[2076].coreConvPct)).toBe(63); // 94 / 150
    expect(Math.round(byYear[2079].coreConvPct)).toBe(15); // 55 / 379
    expect(byYear[2079].coreConvPct).toBeLessThan(byYear[2076].coreConvPct);
  });

  it("shows the fake-credential share of the docket shrinking over time", () => {
    expect(Math.round(byYear[2069].fakeSharePct)).toBe(72); // 56 / 78
    expect(byYear[2080].fakeSharePct).toBeLessThan(10); // 26 / 452 ≈ 5.8%
  });

  it("reconciles cohort backlog to the known ongoing count", () => {
    const totalPending = REPORT.overTime.cohorts.reduce((s, c) => s + c.pending, 0);
    expect(totalPending).toBe(REPORT.outcome.ongoing); // 209
  });
});
