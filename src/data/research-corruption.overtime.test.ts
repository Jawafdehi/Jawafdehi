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

  // The core-graft series swings far too widely to be described as a band or a level in any
  // single year: an earlier version of the page copy called it "the same ~30% band throughout"
  // while these very assertions pinned 64% and 7%. Keep both facts adjacent so the next person
  // to write that sentence has to reckon with the range.
  it("has a core-graft series that swings violently year to year", () => {
    expect(Math.round(byYear[2076].coreConvPct)).toBe(64); // 84 / 131
    expect(Math.round(byYear[2078].coreConvPct)).toBe(7); // 21 / 300
    const spread = Math.max(...rates.map((r) => r.coreConvPct)) - Math.min(...rates.map((r) => r.coreConvPct));
    expect(spread).toBeGreaterThan(50); // 64.1 − 7.0 — never call this a "~30% band"
  });

  // The claim the decomposition sub-caption actually makes. Pooled, core graft is flat-to-up,
  // which is what licenses "the decline is mostly a change of mix".
  it("has core-graft conviction essentially flat between the early and recent windows", () => {
    const pool = (pred: (fy: number) => boolean) => {
      let conv = 0;
      let total = 0;
      REPORT.overTime.byVerdictYear.forEach((r) => {
        if (!pred(r.fy)) return;
        conv += r.convicted - r.fakeConv;
        total += r.convicted + r.partial + r.acquitted - r.fakeDisp;
      });
      return (conv / total) * 100;
    };
    const earlyCore = pool((fy) => fy <= 2071); // 26.0%
    const recentCore = pool((fy) => fy >= 2079); // 30.0%
    expect(Math.round(earlyCore)).toBe(26);
    expect(Math.round(recentCore)).toBe(30);
    // Recent is no WORSE than early — so copy must not say the court convicts core graft less.
    expect(recentCore).toBeGreaterThanOrEqual(earlyCore);
  });

  // "Acquittals now routinely outnumber full convictions" was false: it happened in 3 of 14
  // years. The defensible version is pooled over the recent window only.
  it("has acquittals ahead only in a minority of years, though ahead pooled recently", () => {
    const ahead = REPORT.overTime.byVerdictYear.filter((r) => r.acquitted > r.convicted);
    expect(ahead.map((r) => r.fy)).toEqual([2078, 2080, 2082]);
    expect(ahead.length).toBeLessThan(REPORT.overTime.byVerdictYear.length / 2);
    const recent = REPORT.overTime.byVerdictYear.filter((r) => r.fy >= 2079);
    const acq = recent.reduce((s, r) => s + r.acquitted, 0);
    const conv = recent.reduce((s, r) => s + r.convicted, 0);
    expect(acq).toBeGreaterThan(conv); // 386 vs 345
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

  // `netDelta` (28, over 8 offence-breakdown years) is NOT the difference between the two
  // column totals (32, over all 13). Copy that quotes 28 next to the totals without saying
  // which years it covers leaves a reader unable to reconcile the two, which is how the
  // earlier draft of this section read.
  it("keeps netDelta distinct from the 13-year column difference", () => {
    expect(cc.registerComparableTotal - cc.ciaaFiledTotal).toBe(32);
    expect(cc.netDelta).not.toBe(cc.registerComparableTotal - cc.ciaaFiledTotal);
    expect(cc.netDeltaYears).toBeLessThan(cc.yearsCompared); // 8 of 13
  });

  // fakeCertDelta < netDelta, so some divergence sits outside fake credential. An earlier
  // draft claimed "every offence both sources label the same way matches exactly", which
  // this difference contradicts.
  it("leaves divergence unaccounted for by fake credential alone", () => {
    expect(cc.fakeCertDelta).toBeLessThan(cc.netDelta); // 22 of 28 — 6 elsewhere
  });

  it("marks exactly one surplus bucket as the unexplained residual", () => {
    const residual = cc.surplusReasons.filter((r) => r.unexplained);
    expect(residual).toHaveLength(1);
    expect(residual[0].count).toBe(9);
  });
});

// Chart totals the captions disclose. Each of these three differs from the others and from
// the corpus counts, for a documented reason — so a caption that quotes the wrong one is a
// silent error, not a visible one.
describe("chart denominators — what each chart actually covers", () => {
  const mixTotal = REPORT.chargeMixByYear.reduce(
    (s, r) => s + r.bribery + r.fake + r.embezzlement + r.benefit + r.loss + r.other,
    0,
  );
  const chargeDecided = REPORT.byCharge.reduce((s, c) => s + c.convicted + c.partial + c.acquitted, 0);
  const clean = REPORT.outcome.convicted + REPORT.outcome.partial + REPORT.outcome.acquitted;

  it("has the charge-mix chart covering more than the substantive corpus", () => {
    // 2,852 = 2,949 register − 93 money laundering − 4 petitions. It still carries the 61
    // unclassified matters inside `other`, which `substantive` (2,795) removes — so this
    // chart must NOT be captioned "substantive prosecutions".
    expect(mixTotal).toBe(2852);
    expect(mixTotal).toBeGreaterThan(REPORT.corpus.substantive);
    expect(mixTotal).toBe(REPORT.corpus.ciaaProsecutions - 93 - 4);
  });

  it("has the by-charge chart covering fewer cases than the outcome donut", () => {
    expect(chargeDecided).toBe(2702);
    expect(chargeDecided).toBeLessThan(clean); // 26 decided cases have unclassifiable charge text
  });

  it("still includes money laundering in the by-charge chart", () => {
    // Outside `substantive`, but present as its own row — the caption has to say so.
    expect(REPORT.byCharge.some((c) => c.en === "Money laundering")).toBe(true);
  });

  it("shows illegal benefit was used before FY2078/79, if barely", () => {
    // One FY2069/70 case, so copy must say "barely used", never "absent".
    const early = REPORT.chargeMixByYear.filter((r) => r.fy < 2078);
    expect(early.reduce((s, r) => s + r.benefit, 0)).toBe(1);
  });

  it("shows every baked bench clearing the disclosed decision threshold", () => {
    expect(REPORT.justices).toHaveLength(39);
    expect(Math.min(...REPORT.justices.map((j) => j.decisions))).toBeGreaterThanOrEqual(
      REPORT.justiceMinDecisions,
    );
  });
});

// The CIAA "success" rate comparison. Aligning definitions REVERSES the gap rather than
// closing it, which is the opposite of what the page used to imply.
describe("CIAA success rate vs this archive", () => {
  const clean = REPORT.outcome.convicted + REPORT.outcome.partial + REPORT.outcome.acquitted;
  const fullPct = (REPORT.outcome.convicted / clean) * 100;
  const inclPct = ((REPORT.outcome.convicted + REPORT.outcome.partial) / clean) * 100;

  it("sits above our full-conviction rate but below our including-partial rate", () => {
    expect(REPORT.ciaa.successRatePct).toBeGreaterThan(fullPct); // 52.67 > 45.1
    expect(REPORT.ciaa.successRatePct).toBeLessThan(inclPct); // 52.67 < 61.3
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
