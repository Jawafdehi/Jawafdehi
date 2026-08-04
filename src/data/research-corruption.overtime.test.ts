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
    expect(totalPending).toBe(REPORT.outcome.ongoing); // 206
  });

  it("reconciles filed-by-year to the corpus size", () => {
    const totalFiled = REPORT.trend.filed.reduce((s, n) => s + n, 0);
    expect(totalFiled).toBe(REPORT.corpus.ciaaProsecutions); // 2,949
  });
});

// The cross-check figures are transcribed from a separate analysis rather than derived from
// the tables above, so these guard the transcription, not the arithmetic.
describe("cross-check — CIAA reports vs the court register", () => {
  const cc = REPORT.crossCheck;

  it("has column totals matching the published headline", () => {
    const ciaa = REPORT.sourceAgreement.reduce((s, r) => s + r.ciaaFiled, 0);
    const register = REPORT.sourceAgreement.reduce((s, r) => s + r.registerComparable, 0);
    expect(ciaa).toBe(cc.ciaaFiledTotal); // 2,592
    expect(register).toBe(cc.registerComparableTotal); // 2,624
  });

  it("covers exactly the fiscal years with a published CIAA figure", () => {
    // FY2082/83 is excluded on purpose — the CIAA's 36th annual report is unpublished.
    expect(REPORT.sourceAgreement).toHaveLength(cc.yearsCompared); // 13
    expect(REPORT.sourceAgreement.at(-1)?.fy).toBe(2081);
  });

  it("decomposes the register surplus without a remainder", () => {
    const explained = cc.surplusReasons.reduce((s, r) => s + r.count, 0);
    expect(explained).toBe(cc.registerSurplus); // 19
  });

  it("records that every CIAA-listed case was found in the register", () => {
    expect(cc.foundInRegister).toBe(cc.ciaaListed); // 254 of 254
  });
});

// The "what actually sticks" lead makes five specific claims about bribery and
// fake-credential cases. An earlier version of that copy called bribery one of the charges
// that "mostly fail" when it is in fact second-highest and above the court average — the
// kind of claim that reads fine, contradicts the chart beside it, and survives a refresh
// unnoticed. One assertion per claim.
describe("conviction by charge — the claims the lead copy makes", () => {
  const rate = (c: (typeof REPORT.byCharge)[number]) =>
    (c.convicted / (c.convicted + c.partial + c.acquitted)) * 100;
  const decided = (c: (typeof REPORT.byCharge)[number]) => c.convicted + c.partial + c.acquitted;
  const byRate = [...REPORT.byCharge].sort((a, b) => rate(b) - rate(a));
  const find = (en: string) => {
    const c = REPORT.byCharge.find((x) => x.en === en);
    if (!c) throw new Error(`charge family missing: ${en}`);
    return c;
  };
  const fake = find("Fake credential");
  const bribery = find("Bribery");
  const courtAvg = (REPORT.outcome.convicted / (REPORT.outcome.convicted + REPORT.outcome.partial + REPORT.outcome.acquitted)) * 100;

  it("has fake credential first and bribery second by conviction rate", () => {
    expect(byRate[0].en).toBe("Fake credential"); // ~90%
    expect(byRate[1].en).toBe("Bribery"); // ~47%
  });

  it("has bribery above the court average, not among the failures", () => {
    expect(rate(bribery)).toBeGreaterThan(courtAvg); // 46.8 > 45.1
  });

  it("has bribery as the largest decided docket", () => {
    const largest = [...REPORT.byCharge].sort((a, b) => decided(b) - decided(a))[0];
    expect(largest.en).toBe("Bribery"); // 903 decided
  });

  it("has the two of them supplying four in five full convictions", () => {
    const share = (fake.convicted + bribery.convicted) / REPORT.outcome.convicted;
    expect(share).toBeGreaterThan(0.78);
    expect(share).toBeLessThan(0.85); // ~81%
  });

  it("has illegal benefit at the bottom", () => {
    expect(byRate.at(-1)?.en).toBe("Illegal benefit"); // 4.5%
  });
});
