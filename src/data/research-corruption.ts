// Baked, point-in-time dataset for the "Corruption Accountability" research report
// (/research/corruption-accountability). Frozen snapshot — refresh by re-running the
// saved queries in the meta repo (work/2026-07-18-corruption-analyses/metrics.sql) and
// re-verifying against the cited CIAA annual-report materials.
//
// Every figure is sourced to an IN-PLATFORM material or court record (see `citations`),
// never an external news site. Public copy never names the internal court-data pipeline;
// it is "Court records ingested from Nepal's judiciary".

export type OutcomeCounts = {
  /** ठहर — charge upheld / full conviction. */
  convicted: number;
  /** आंशिक ठहर — partial conviction. */
  partial: number;
  /** सफाई — acquittal. */
  acquitted: number;
};

export type ChargeOutcome = OutcomeCounts & {
  /** English offense-family label. */
  en: string;
  /** Nepali offense-family label. */
  ne: string;
};

export type JusticeRow = {
  /** Nepali name as it appears in the bench record. */
  name: string;
  /** Number of deciding hearings the justice sat on (bench-grain). */
  decisions: number;
  /** Full-conviction rate (%). */
  convPct: number;
};

export type FunnelStageData = {
  key: string;
  count: number;
  /** Citation key into `citations` for the material backing this stage. */
  source: keyof typeof CITATIONS;
};

export type VerdictYearRow = {
  /** Bikram Sambat verdict year (parsed from case status). */
  bs: number;
  /** ठहर — full conviction. */
  convicted: number;
  /** आंशिक ठहर — partial conviction. */
  partial: number;
  /** सफाई — acquittal. */
  acquitted: number;
  /** Full convictions among fake-credential cases this year. */
  fakeConv: number;
  /** Decided fake-credential cases this year (the ~88%-conviction charge). */
  fakeDisp: number;
};

export type CohortRow = {
  /** Bikram Sambat filing (registration) year. */
  bs: number;
  /** Cases from this cohort already decided. */
  decided: number;
  /** Cases from this cohort still awaiting a verdict. */
  pending: number;
  /** Median months from registration to verdict (decided cases only). */
  medianMonths: number;
};

export type ChargeMixYear = {
  /** Bikram Sambat filing (registration) year. */
  bs: number;
  bribery: number;
  fake: number;
  embezzlement: number;
  benefit: number;
  loss: number;
  /** Smaller families folded together (illicit enrichment, irregularity, etc.). */
  other: number;
};

export type MonthFiling = {
  /** Nepali month index: 1 = Baisakh … 12 = Chaitra. */
  month: number;
  name: string;
  /** Mean cases filed in this month across complete BS years. */
  mean: number;
  /** ±1 sample standard deviation across those years. */
  sd: number;
};

// In-platform citation targets. Each is a real public page on jawafdehi.org.
export const CITATIONS = {
  ciaa35: "https://jawafdehi.org/material/ciaa_annual_report/ee0b4f80b24b8665",
  ciaa34: "https://jawafdehi.org/material/ciaa_annual_report/9ad112a186a0b4ed",
  ciaa33: "https://jawafdehi.org/material/ciaa_annual_report/8b781a41a6138292",
  ciaa32:
    "https://jawafdehi.org/material/ciaa_annual_report/4._32nd_annual_report_2078_079_fek7bv_ba92e14e",
  /** The whole CIAA annual-report series (41 materials). */
  ciaaReports: "https://jawafdehi.org/search?type=material&q=CIAA%20annual%20report",
  /** CIAA charge-sheet-filing announcements (3,438 press releases). */
  ciaaPressReleases: "https://jawafdehi.org/search?type=material&q=CIAA%20press%20release",
  /** AG abhiyog-patra (charge sheets, 99,783). */
  chargeSheets: "https://jawafdehi.org/search?type=material&q=charge%20sheet",
  /** The Special Court record base. */
  courtRecords: "https://jawafdehi.org/courtcases",
  /** Representative decided cases (verify each resolves logged-out). */
  caseBriberyConvicted: "https://jawafdehi.org/courtcase/special/081-CR-0077",
  caseLossAcquitted: "https://jawafdehi.org/courtcase/special/082-CR-0011",
  caseEmbezzlementConvicted: "https://jawafdehi.org/courtcase/special/075-CR-0309",
  /** Live coverage counts. */
  dataQuality: "https://jawafdehi.org/data-quality",
} as const;

export const REPORT = {
  /** Snapshot label (Bikram Sambat). */
  snapshotBs: "2083",
  snapshotAd: "2026-07",

  // --- Corpus ---
  corpus: {
    specialCourtRows: 12601, // Q1
    ciaaProsecutions: 3278, // Q2 (plaintiff = Government of Nepal)
    substantive: 2842, // ~ (3278 − 309 petitions − 95 money-laundering − 32 other)
  },

  // --- Outcomes (Q5, corpus) — case-grain clean dispositions ---
  outcome: {
    convicted: 1310,
    partial: 448,
    acquitted: 1077,
    decided: 3069, // Q6
    ongoing: 209, // Q6
  } satisfies OutcomeCounts & { decided: number; ongoing: number },

  // --- Conviction by charge type (Q11), sorted high → low conviction rate ---
  byCharge: [
    { en: "Fake credential", ne: "नक्कली प्रमाण पत्र", convicted: 643, partial: 5, acquitted: 80 },
    { en: "Bribery", ne: "रिसवत / घुस", convicted: 419, partial: 109, acquitted: 374 },
    { en: "Money laundering", ne: "सम्पत्ति शुद्धीकरण", convicted: 33, partial: 35, acquitted: 19 },
    { en: "False statement", ne: "झुठ्ठा विवरण", convicted: 16, partial: 11, acquitted: 33 },
    { en: "Illicit enrichment", ne: "गैरकानूनी सम्पत्ति", convicted: 26, partial: 15, acquitted: 58 },
    { en: "Embezzlement", ne: "रकम हिनामिना", convicted: 90, partial: 88, acquitted: 202 },
    { en: "Forged document", ne: "गलत लिखत", convicted: 7, partial: 12, acquitted: 12 },
    { en: "Exam rigging", ne: "परीक्षा फेरबदल", convicted: 6, partial: 15, acquitted: 6 },
    { en: "Loss to government", ne: "हानीनोक्सानी", convicted: 30, partial: 35, acquitted: 93 },
    { en: "Irregularity", ne: "अनियमितता", convicted: 23, partial: 45, acquitted: 65 },
    { en: "Govt land misregistration", ne: "सरकारी जग्गा", convicted: 5, partial: 26, acquitted: 10 },
    { en: "Revenue leakage", ne: "राजश्व चुहावट", convicted: 4, partial: 4, acquitted: 26 },
    { en: "Illegal benefit", ne: "गैरकानुनी लाभ", convicted: 6, partial: 38, acquitted: 86 },
  ] satisfies ChargeOutcome[],

  // --- Offense mix (Q3) — prosecutions filed by offense family ---
  mix: [
    { en: "Bribery", ne: "रिसवत / घुस", count: 934 },
    { en: "Fake credential", ne: "नक्कली प्रमाण पत्र", count: 740 },
    { en: "Embezzlement", ne: "रकम हिनामिना", count: 397 },
    { en: "Loss to government", ne: "हानीनोक्सानी", count: 175 },
    { en: "Illegal benefit", ne: "गैरकानुनी लाभ", count: 140 },
    { en: "Irregularity", ne: "अनियमितता", count: 140 },
    { en: "Illicit enrichment", ne: "गैरकानूनी सम्पत्ति", count: 114 },
    { en: "Money laundering", ne: "सम्पत्ति शुद्धीकरण", count: 95 },
    { en: "False statement", ne: "झुठ्ठा विवरण", count: 60 },
    { en: "Govt land misregistration", ne: "सरकारी जग्गा", count: 41 },
    { en: "Revenue leakage", ne: "राजश्व चुहावट", count: 37 },
    { en: "Forged document", ne: "गलत लिखत", count: 34 },
    { en: "Exam rigging", ne: "परीक्षा फेरबदल", count: 30 },
  ],

  // --- Per-justice full-conviction rate (bench-grain), sorted high → low ---
  justices: [
    { name: "गौरी वहादुर कार्की", decisions: 34, convPct: 85.3 },
    { name: "ओम प्रकाश मिश्र", decisions: 47, convPct: 78.7 },
    { name: "कृष्ण गिरी", decisions: 93, convPct: 76.3 },
    { name: "केदार प्रसाद चालिसे", decisions: 233, convPct: 74.2 },
    { name: "द्वारिकामान जोशी", decisions: 189, convPct: 72.5 },
    { name: "भूपेन्द्र प्रसाद राई", decisions: 415, convPct: 64.8 },
    { name: "मोहनरमण भट्टराई", decisions: 505, convPct: 61.4 },
    { name: "प्रमोदकुमार श्रेष्ठ वैद्य", decisions: 218, convPct: 61.0 },
    { name: "बाबुराम रेग्मी", decisions: 268, convPct: 60.4 },
    { name: "नरेन्द्र कुमार शिवाकोटी", decisions: 271, convPct: 52.4 },
    { name: "महेश प्रसाद पुडासैनी", decisions: 244, convPct: 52.0 },
    { name: "प्रभा बस्नेत", decisions: 246, convPct: 51.2 },
    { name: "पवनकुमार शर्मा", decisions: 244, convPct: 49.2 },
    { name: "राम बहादुर थापा", decisions: 247, convPct: 36.8 },
    { name: "रितेन्द्र थापा", decisions: 235, convPct: 32.3 },
    { name: "तेज नारायण सिंह राई", decisions: 279, convPct: 31.9 },
    { name: "टेक नारायण कुँवर", decisions: 338, convPct: 31.1 },
    { name: "शालिग्राम कोइराला", decisions: 265, convPct: 30.6 },
    { name: "यमुना भट्टराई", decisions: 316, convPct: 30.1 },
    { name: "खुशी प्रसाद थारु", decisions: 452, convPct: 27.7 },
    { name: "श्रीकान्त पौडेल", decisions: 410, convPct: 26.6 },
    { name: "बलभद्र बास्तोला", decisions: 338, convPct: 24.9 },
  ] satisfies JusticeRow[],

  // --- Filed vs decided, by Bikram Sambat year (Q7 / Q8) ---
  trend: {
    years: [2069, 2070, 2071, 2072, 2073, 2074, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083],
    filed: [172, 146, 349, 120, 167, 158, 355, 509, 229, 101, 198, 303, 198, 193, 23],
    decided: [86, 126, 138, 251, 150, 180, 275, 251, 147, 116, 438, 529, 279, 92, 11],
  },

  // --- Charge mix by filing year (BS registration year), substantive prosecutions ---
  // Bucketed from raw case_type over plaintiff = Government of Nepal, Special Court,
  // petitions & money-laundering excluded. `other` folds the smaller families
  // (illicit enrichment, irregularity, false statement, land, revenue, forgery, exam).
  // The story: fake-credential's share falls from ~75% (BS 2069) to single digits
  // by BS 2078–2080 (with a one-year rebound in 2081), while the newer illegal-
  // benefit charge (absent before BS 2078) and loss to government grow.
  // BS 2083 (partial year) omitted.
  chargeMixByYear: [
    { bs: 2069, bribery: 7, fake: 116, embezzlement: 6, benefit: 1, loss: 0, other: 24 },
    { bs: 2070, bribery: 17, fake: 70, embezzlement: 6, benefit: 0, loss: 0, other: 37 },
    { bs: 2071, bribery: 62, fake: 117, embezzlement: 98, benefit: 0, loss: 11, other: 58 },
    { bs: 2072, bribery: 43, fake: 27, embezzlement: 21, benefit: 0, loss: 3, other: 22 },
    { bs: 2073, bribery: 53, fake: 54, embezzlement: 29, benefit: 0, loss: 0, other: 24 },
    { bs: 2074, bribery: 89, fake: 19, embezzlement: 21, benefit: 0, loss: 1, other: 17 },
    { bs: 2075, bribery: 130, fake: 117, embezzlement: 34, benefit: 0, loss: 1, other: 45 },
    { bs: 2076, bribery: 244, fake: 81, embezzlement: 64, benefit: 0, loss: 11, other: 63 },
    { bs: 2077, bribery: 93, fake: 23, embezzlement: 23, benefit: 0, loss: 24, other: 33 },
    { bs: 2078, bribery: 28, fake: 4, embezzlement: 22, benefit: 3, loss: 13, other: 17 },
    { bs: 2079, bribery: 24, fake: 10, embezzlement: 30, benefit: 39, loss: 30, other: 38 },
    { bs: 2080, bribery: 55, fake: 16, embezzlement: 8, benefit: 30, loss: 36, other: 46 },
    { bs: 2081, bribery: 37, fake: 37, embezzlement: 4, benefit: 29, loss: 8, other: 19 },
    { bs: 2082, bribery: 34, fake: 12, embezzlement: 23, benefit: 36, loss: 36, other: 40 },
  ] satisfies ChargeMixYear[],

  // --- Cases filed per Nepali month — mean ± sample SD across complete years ---
  // Mean and standard deviation of monthly filings across BS 2069–2082 (14 years);
  // error bars are ±1 SD, showing year-to-year variability. Filings peak in Ashadh
  // (fiscal year-end) and trough in Kartik (Dashain/Tihar festival month).
  filedByMonth: [
    { month: 1, name: "Baisakh", mean: 13.9, sd: 7.3 },
    { month: 2, name: "Jestha", mean: 21.4, sd: 13.3 },
    { month: 3, name: "Ashadh", mean: 27.9, sd: 15.7 },
    { month: 4, name: "Shrawan", mean: 15.3, sd: 8.8 },
    { month: 5, name: "Bhadra", mean: 19.6, sd: 12.9 },
    { month: 6, name: "Ashwin", mean: 15.9, sd: 12.4 },
    { month: 7, name: "Kartik", mean: 11.2, sd: 11.3 },
    { month: 8, name: "Mangsir", mean: 15.2, sd: 11.1 },
    { month: 9, name: "Poush", mean: 16.8, sd: 11.3 },
    { month: 10, name: "Magh", mean: 15.4, sd: 8.3 },
    { month: 11, name: "Falgun", mean: 17.9, sd: 14.9 },
    { month: 12, name: "Chaitra", mean: 16.5, sd: 7.0 },
  ] satisfies MonthFiling[],

  // --- Funnel (CIAA annual report + our court records) ---
  // Complaint, investigation + prosecution counts from the CIAA 35th annual report
  // (FY 2081/82): 28,554 newly registered complaints (Table 2.2, चालु आ.व. column) — the
  // 37,026 "दर्ता" headline also counts 8,472 prior-year backlog re-processed this year, so
  // it is total workload, not single-year intake. Of these, 947 completed a full
  // investigation and 137 were prosecuted; the conviction stage applies our measured
  // full-conviction rate to the filed count. The `investigated` stage keeps the funnel
  // honest — the steep drop is at intake screening, not the courtroom, and the CIAA
  // prosecutes ~1 in 7 of the complaints it actually investigates.
  funnel: [
    { key: "complaints", count: 28554, source: "ciaa35" },
    { key: "investigated", count: 947, source: "ciaa35" },
    { key: "filed", count: 137, source: "ciaa35" },
    { key: "convicted", count: 63, source: "courtRecords" },
  ] satisfies FunnelStageData[],

  // Figures that originate in the CIAA annual reports (cite the report materials).
  ciaa: {
    complaintsYear: 28554, // 35th report, FY 2081/82 — newly registered (excl. 8,472 carryover; 37,026 total workload)
    casesFiledYear: 137,
    successRatePct: 52.67, // CIAA counts full + partial as "success" (single year, volatile YoY ~33–72%)
    damagesClaimedYearBn: 6.02, // FY 2081/82 damages (bigo) demanded, Rs (verified Rs 6,018,472,692)
    complaints5yr: 107050, // FY2077/78–2081/82 new registrations (5yr workload 148,235 minus 41,185 recycled backlog)
    casesFiled5yr: 744, // FY2077/78–2081/82 (113+131+162+201+137)
  },

  // --- Defendant identity resolution (Q10) ---
  entityResolution: {
    defendantRows: 19222,
    distinctNames: 8384,
    resolved: 607,
  },

  // --- Over time -------------------------------------------------------------
  // Conviction/acquittal by VERDICT year and the fake-credential vs core-graft
  // decomposition (Q13/Q14); case pace + backlog by FILING-year cohort (Q15/Q16).
  overTime: {
    // Outcome + fake-credential split, keyed on the parsed Bikram Sambat verdict
    // year. BS 2083 is a partial (mid-snapshot) year and is omitted from the rate
    // trends. `fakeDisp`/`fakeConv` isolate documentary fake-credential cases (the
    // ~88%-conviction charge); the remainder reads as core financial graft.
    byVerdictYear: [
      { bs: 2069, convicted: 59, partial: 5, acquitted: 14, fakeConv: 48, fakeDisp: 56 },
      { bs: 2070, convicted: 84, partial: 10, acquitted: 18, fakeConv: 74, fakeDisp: 83 },
      { bs: 2071, convicted: 84, partial: 9, acquitted: 38, fakeConv: 61, fakeDisp: 70 },
      { bs: 2072, convicted: 111, partial: 27, acquitted: 99, fakeConv: 81, fakeDisp: 98 },
      { bs: 2073, convicted: 82, partial: 24, acquitted: 39, fakeConv: 36, fakeDisp: 40 },
      { bs: 2074, convicted: 90, partial: 21, acquitted: 61, fakeConv: 54, fakeDisp: 68 },
      { bs: 2075, convicted: 167, partial: 36, acquitted: 50, fakeConv: 77, fakeDisp: 82 },
      { bs: 2076, convicted: 155, partial: 27, acquitted: 32, fakeConv: 61, fakeDisp: 64 },
      { bs: 2077, convicted: 68, partial: 24, acquitted: 36, fakeConv: 31, fakeDisp: 33 },
      { bs: 2078, convicted: 31, partial: 11, acquitted: 59, fakeConv: 16, fakeDisp: 16 },
      { bs: 2079, convicted: 91, partial: 70, acquitted: 261, fakeConv: 36, fakeDisp: 43 },
      { bs: 2080, convicted: 151, partial: 93, acquitted: 208, fakeConv: 24, fakeDisp: 26 },
      { bs: 2081, convicted: 85, partial: 45, acquitted: 96, fakeConv: 28, fakeDisp: 30 },
      { bs: 2082, convicted: 31, partial: 17, acquitted: 27, fakeConv: 15, fakeDisp: 18 },
    ] satisfies VerdictYearRow[],

    // Filing-year cohorts: decided vs still-pending, and the median months from
    // registration to verdict. Cohorts through BS `completeThroughBs` are
    // essentially fully adjudicated (<=4 pending); later cohorts are still being
    // decided, so their median is provisional (only the fast cases have landed).
    // pending sums to 209 = the known ongoing count; decided+pending matches the
    // filing counts in `trend.filed`.
    cohorts: [
      { bs: 2069, decided: 172, pending: 0, medianMonths: 10.0 },
      { bs: 2070, decided: 146, pending: 0, medianMonths: 12.5 },
      { bs: 2071, decided: 349, pending: 0, medianMonths: 13.0 },
      { bs: 2072, decided: 120, pending: 0, medianMonths: 17.0 },
      { bs: 2073, decided: 167, pending: 0, medianMonths: 15.0 },
      { bs: 2074, decided: 158, pending: 0, medianMonths: 14.0 },
      { bs: 2075, decided: 355, pending: 0, medianMonths: 14.0 },
      { bs: 2076, decided: 509, pending: 0, medianMonths: 30.0 },
      { bs: 2077, decided: 227, pending: 2, medianMonths: 24.0 },
      { bs: 2078, decided: 99, pending: 2, medianMonths: 19.0 },
      { bs: 2079, decided: 194, pending: 4, medianMonths: 13.5 },
      { bs: 2080, decided: 273, pending: 30, medianMonths: 5.0 },
      { bs: 2081, decided: 179, pending: 19, medianMonths: 2.0 },
      { bs: 2082, decided: 58, pending: 135, medianMonths: 3.0 },
      { bs: 2083, decided: 6, pending: 17, medianMonths: 0.0 },
    ] satisfies CohortRow[],

    /** Filing cohorts up to and including this BS year are treated as complete. */
    completeThroughBs: 2079,
  },
} as const;

/** Derived: share (%) of a single outcome within a charge row. */
export function outcomePct(row: OutcomeCounts, key: keyof OutcomeCounts): number {
  const total = row.convicted + row.partial + row.acquitted;
  return total ? (row[key] / total) * 100 : 0;
}

export type VerdictYearRates = {
  year: number;
  /** Decided cases this year. */
  total: number;
  /** Full-conviction rate (%). */
  convPct: number;
  /** Acquittal rate (%). */
  acqPct: number;
  /** Partial-conviction rate (%). */
  partPct: number;
  /** Full-conviction rate on everything except fake-credential cases (%). */
  coreConvPct: number;
  /** Fake-credential share of the decided docket (%). */
  fakeSharePct: number;
};

/** Derived per-year rates powering the outcome-trend and decomposition charts. */
export function verdictYearRates(rows: readonly VerdictYearRow[]): VerdictYearRates[] {
  return rows.map((r) => {
    const total = r.convicted + r.partial + r.acquitted;
    const coreDisp = total - r.fakeDisp;
    const coreConv = r.convicted - r.fakeConv;
    return {
      year: r.bs,
      total,
      convPct: total ? (r.convicted / total) * 100 : 0,
      acqPct: total ? (r.acquitted / total) * 100 : 0,
      partPct: total ? (r.partial / total) * 100 : 0,
      coreConvPct: coreDisp ? (coreConv / coreDisp) * 100 : 0,
      fakeSharePct: total ? (r.fakeDisp / total) * 100 : 0,
    };
  });
}
