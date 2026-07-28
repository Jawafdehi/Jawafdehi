// Baked, point-in-time dataset for the "Corruption Accountability" research report
// (/research/corruption-accountability). Frozen snapshot — regenerate from the
// reproducible notebook in the meta repo
// (work/2026-07-24-corruption-research-notebook: corpus_data.py derives every table
// from the Special Court -CR- criminal register; assumptions.csv holds the CIAA
// annual-report figures). The by-year axis is FISCAL YEAR (2069/70 … 2082/83), the
// same fiscal-year binning the notebook uses — never single Bikram-Sambat years.
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
  /** Fiscal year of verdict, as its start year — 2069 = FY 2069/70. */
  fy: number;
  /** ठहर — full conviction. */
  convicted: number;
  /** आंशिक ठहर — partial conviction. */
  partial: number;
  /** सफाई — acquittal. */
  acquitted: number;
  /** Full convictions among fake-credential cases this year. */
  fakeConv: number;
  /** Decided fake-credential cases this year (the ~90%-conviction charge). */
  fakeDisp: number;
};

export type CohortRow = {
  /** Fiscal year of filing (registration), as its start year — 2069 = FY 2069/70. */
  fy: number;
  /** Cases from this cohort already decided. */
  decided: number;
  /** Cases from this cohort still awaiting a verdict. */
  pending: number;
  /** Median months from registration to verdict (decided cases only). */
  medianMonths: number;
};

export type ChargeMixYear = {
  /** Fiscal year of filing, as its start year — 2069 = FY 2069/70. */
  fy: number;
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
  /** Mean cases filed in this month across complete fiscal years. */
  mean: number;
  /** ±1 sample standard deviation across those years. */
  sd: number;
};

/** Fiscal-year label from its start year: 2069 → "2069/70", 2082 → "2082/83". */
export const fyLabel = (fy: number): string => `${fy}/${String((fy + 1) % 100).padStart(2, "0")}`;

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
  // CIAA prosecutions = the Special Court's -CR- criminal register (no plaintiff
  // filter — the register *is* the definition), FY2069/70–2082/83.
  corpus: {
    specialCourtRows: 12601, // full Special Court archive (all registers)
    ciaaProsecutions: 2880, // -CR- criminal register, FY2069/70–2082/83 (no plaintiff filter)
    substantive: 2726, // minus money-laundering (93) + unclassified other (61)
  },

  // --- Outcomes (corpus) — case-grain dispositions ---
  // Two denominators, by design (matches the notebook):
  //   • convicted + partial + acquitted = 2,728 clean dispositions (ठहर / आंशिक / सफाई) —
  //     the conviction-rate denominator and the donut total.
  //   • `decided` = 2,710 cases whose case_status starts फैसला — 18 fewer, because a few
  //     carry a deciding-hearing disposition without that status; this is what the
  //     filed-vs-decided trend (`trend.decided`) sums to.
  // `ongoing` = 169 cases with a status but no terminal disposition (= sum of cohort `pending`).
  outcome: {
    convicted: 1230,
    partial: 442,
    acquitted: 1056,
    decided: 2710,
    ongoing: 169,
  } satisfies OutcomeCounts & { decided: number; ongoing: number },

  // --- Conviction by charge type, sorted high → low conviction rate ---
  byCharge: [
    { en: "Fake credential", ne: "नक्कली प्रमाण पत्र", convicted: 570, partial: 5, acquitted: 57 },
    { en: "Bribery", ne: "रिसवत / घुस", convicted: 423, partial: 107, acquitted: 373 },
    { en: "Money laundering", ne: "सम्पत्ति शुद्धीकरण", convicted: 33, partial: 33, acquitted: 18 },
    { en: "False statement", ne: "झुठ्ठा विवरण", convicted: 16, partial: 11, acquitted: 33 },
    { en: "Embezzlement", ne: "रकम हिनामिना", convicted: 87, partial: 85, acquitted: 201 },
    { en: "Exam rigging", ne: "परीक्षा फेरबदल", convicted: 6, partial: 14, acquitted: 6 },
    { en: "Forged document", ne: "गलत लिखत", convicted: 7, partial: 12, acquitted: 12 },
    { en: "Illicit enrichment", ne: "गैरकानूनी सम्पत्ति", convicted: 19, partial: 16, acquitted: 58 },
    { en: "Loss to government", ne: "हानीनोक्सानी", convicted: 31, partial: 36, acquitted: 94 },
    { en: "Irregularity", ne: "अनियमितता", convicted: 22, partial: 44, acquitted: 64 },
    { en: "Govt land misregistration", ne: "सरकारी जग्गा", convicted: 5, partial: 26, acquitted: 10 },
    { en: "Revenue leakage", ne: "राजश्व चुहावट", convicted: 4, partial: 4, acquitted: 26 },
    { en: "Illegal benefit", ne: "गैरकानुनी लाभ", convicted: 6, partial: 39, acquitted: 89 },
  ] satisfies ChargeOutcome[],

  // --- Offense mix — substantive prosecutions filed by offense family ---
  mix: [
    { en: "Bribery", ne: "रिसवत / घुस", count: 933 },
    { en: "Fake credential", ne: "नक्कली प्रमाण पत्र", count: 644 },
    { en: "Embezzlement", ne: "रकम हिनामिना", count: 387 },
    { en: "Loss to government", ne: "हानीनोक्सानी", count: 176 },
    { en: "Illegal benefit", ne: "गैरकानुनी लाभ", count: 140 },
    { en: "Irregularity", ne: "अनियमितता", count: 136 },
    { en: "Illicit enrichment", ne: "गैरकानूनी सम्पत्ति", count: 107 },
    { en: "Money laundering", ne: "सम्पत्ति शुद्धीकरण", count: 93 },
    { en: "False statement", ne: "झुठ्ठा विवरण", count: 61 },
    { en: "Govt land misregistration", ne: "सरकारी जग्गा", count: 42 },
    { en: "Revenue leakage", ne: "राजश्व चुहावट", count: 37 },
    { en: "Forged document", ne: "गलत लिखत", count: 34 },
    { en: "Exam rigging", ne: "परीक्षा फेरबदल", count: 29 },
  ],

  // --- Per-justice full-conviction rate (bench-grain, ≥30 decisions), high → low ---
  justices: [
    { name: "केदार प्रसाद चालिसे", decisions: 111, convPct: 77.5 },
    { name: "कृष्ण गिरी", decisions: 93, convPct: 76.3 },
    { name: "द्वारिकामान जोशी", decisions: 189, convPct: 72.5 },
    { name: "शिवराज अधिकारी", decisions: 93, convPct: 72.0 },
    { name: "रवि शर्मा अर्याल", decisions: 86, convPct: 69.8 },
    { name: "शान्तिसिंह थापा", decisions: 140, convPct: 64.3 },
    { name: "भूपेन्द्र प्रसाद राई", decisions: 334, convPct: 64.1 },
    { name: "बालेन्द्र रुपाखेती", decisions: 150, convPct: 64.0 },
    { name: "प्रमोदकुमार श्रेष्ठ वैद्य", decisions: 219, convPct: 61.2 },
    { name: "मोहनरमण भट्टराई", decisions: 429, convPct: 60.8 },
    { name: "बाबुराम रेग्मी", decisions: 268, convPct: 60.4 },
    { name: "नारायणप्रसाद पोखरेल", decisions: 138, convPct: 60.1 },
    { name: "चन्द्रबहादुर सारु", decisions: 151, convPct: 59.6 },
    { name: "रत्नबहादुर बागचन्द", decisions: 123, convPct: 56.9 },
    { name: "चण्डीराज ढकाल", decisions: 149, convPct: 56.4 },
    { name: "नित्यानन्द पाण्डेय", decisions: 79, convPct: 53.2 },
    { name: "नरेन्द्र कुमार शिवाकोटी", decisions: 271, convPct: 52.4 },
    { name: "महेश प्रसाद पुडासैनी", decisions: 242, convPct: 52.1 },
    { name: "प्रभा बस्नेत", decisions: 243, convPct: 51.9 },
    { name: "पवनकुमार शर्मा", decisions: 241, convPct: 49.4 },
    { name: "अब्दुल अजिज मुसलमान", decisions: 81, convPct: 48.1 },
    { name: "राम बहादुर थापा", decisions: 247, convPct: 36.8 },
    { name: "विदुर कोइराला", decisions: 81, convPct: 35.8 },
    { name: "नारायणप्रसाद पौडेल", decisions: 62, convPct: 33.9 },
    { name: "मुरारीबाबु श्रेष्ठ", decisions: 243, convPct: 33.3 },
    { name: "प्रेमराज कार्की", decisions: 42, convPct: 33.3 },
    { name: "रितेन्द्र थापा", decisions: 235, convPct: 32.3 },
    { name: "तेज नारायण सिंह राई", decisions: 280, convPct: 32.1 },
    { name: "टेक नारायण कुँवर", decisions: 339, convPct: 31.3 },
    { name: "डिल्लीरत्न श्रेष्ठ", decisions: 61, convPct: 31.1 },
    { name: "शालिग्राम कोइराला", decisions: 265, convPct: 30.6 },
    { name: "यमुना भट्टराई", decisions: 316, convPct: 30.1 },
    { name: "हेमन्त रावल", decisions: 65, convPct: 29.2 },
    { name: "सुदर्शनदेव भट्ट", decisions: 69, convPct: 29.0 },
    { name: "खुशी प्रसाद थारु", decisions: 453, convPct: 27.8 },
    { name: "कान्त पौडेल", decisions: 411, convPct: 26.8 },
    { name: "बलभद्र बास्तोला", decisions: 339, convPct: 25.1 },
    { name: "उमेश कोइराला", decisions: 57, convPct: 22.8 },
    { name: "रमेशकुमार पोखरेल", decisions: 143, convPct: 21.0 },
  ] satisfies JusticeRow[],

  // --- Filed vs decided, by fiscal year (years = FY start; 2069 = FY 2069/70) ---
  trend: {
    years: [2069, 2070, 2071, 2072, 2073, 2074, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082],
    filed: [126, 185, 310, 150, 164, 197, 369, 445, 127, 135, 176, 211, 143, 142],
    decided: [35, 87, 191, 218, 171, 176, 229, 172, 135, 339, 270, 503, 130, 54],
  },

  // --- Charge mix by fiscal filing year, substantive prosecutions ---
  // `other` folds the smaller families (illicit enrichment, irregularity, false
  // statement, land, revenue, forgery, exam). Fake-credential's share falls from
  // ~70% (FY2069/70) to single digits by FY2077/78–2079/80 (with a rebound in
  // FY2080/81), while the newer illegal-benefit charge (absent before FY2078/79)
  // and loss to government grow.
  chargeMixByYear: [
    { fy: 2069, bribery: 7, fake: 79, embezzlement: 2, benefit: 1, loss: 0, other: 24 },
    { fy: 2070, bribery: 22, fake: 78, embezzlement: 15, benefit: 0, loss: 2, other: 64 },
    { fy: 2071, bribery: 68, fake: 91, embezzlement: 90, benefit: 0, loss: 10, other: 50 },
    { fy: 2072, bribery: 47, fake: 46, embezzlement: 25, benefit: 0, loss: 2, other: 26 },
    { fy: 2073, bribery: 62, fake: 40, embezzlement: 28, benefit: 0, loss: 1, other: 27 },
    { fy: 2074, bribery: 97, fake: 58, embezzlement: 21, benefit: 0, loss: 0, other: 17 },
    { fy: 2075, bribery: 148, fake: 91, embezzlement: 51, benefit: 0, loss: 1, other: 69 },
    { fy: 2076, bribery: 222, fake: 79, embezzlement: 58, benefit: 0, loss: 18, other: 58 },
    { fy: 2077, bribery: 70, fake: 3, embezzlement: 11, benefit: 0, loss: 18, other: 11 },
    { fy: 2078, bribery: 32, fake: 6, embezzlement: 31, benefit: 9, loss: 26, other: 28 },
    { fy: 2079, bribery: 31, fake: 8, embezzlement: 21, benefit: 40, loss: 22, other: 43 },
    { fy: 2080, bribery: 48, fake: 31, embezzlement: 7, benefit: 40, loss: 34, other: 43 },
    { fy: 2081, bribery: 36, fake: 27, embezzlement: 10, benefit: 30, loss: 16, other: 22 },
    { fy: 2082, bribery: 40, fake: 7, embezzlement: 17, benefit: 20, loss: 26, other: 25 },
  ] satisfies ChargeMixYear[],

  // --- Cases filed per Nepali month — mean ± sample SD across complete years ---
  // Filings peak in Ashadh (fiscal year-end) and trough in Kartik (Dashain/Tihar).
  filedByMonth: [
    { month: 1, name: "Baisakh", mean: 14.1, sd: 7.2 },
    { month: 2, name: "Jestha", mean: 21.0, sd: 13.8 },
    { month: 3, name: "Ashadh", mean: 24.6, sd: 15.0 },
    { month: 4, name: "Shrawan", mean: 15.4, sd: 8.7 },
    { month: 5, name: "Bhadra", mean: 19.6, sd: 12.9 },
    { month: 6, name: "Ashwin", mean: 16.1, sd: 12.3 },
    { month: 7, name: "Kartik", mean: 11.6, sd: 11.4 },
    { month: 8, name: "Mangsir", mean: 15.4, sd: 11.3 },
    { month: 9, name: "Poush", mean: 17.0, sd: 11.3 },
    { month: 10, name: "Magh", mean: 15.8, sd: 8.1 },
    { month: 11, name: "Falgun", mean: 18.1, sd: 14.8 },
    { month: 12, name: "Chaitra", mean: 16.9, sd: 7.0 },
  ] satisfies MonthFiling[],

  // --- Funnel (CIAA annual report + our court records) ---
  // Complaint, investigation + prosecution counts from the CIAA 35th annual report
  // (FY 2081/82): 28,554 newly registered complaints (Table 2.2, चालु आ.व. column) — the
  // 37,026 "दर्ता" headline also counts 8,472 prior-year backlog re-processed this year, so
  // it is total workload, not single-year intake. Of these, 947 completed a full
  // investigation and 137 were prosecuted; the conviction stage applies our measured
  // full-conviction rate (45%) to the filed count. The `investigated` stage keeps the
  // funnel honest — the steep drop is at intake screening, not the courtroom, and the
  // CIAA prosecutes ~1 in 7 of the complaints it actually investigates.
  funnel: [
    { key: "complaints", count: 28554, source: "ciaa35" },
    { key: "investigated", count: 947, source: "ciaa35" },
    { key: "filed", count: 137, source: "ciaa35" },
    { key: "convicted", count: 62, source: "courtRecords" },
  ] satisfies FunnelStageData[],

  // Figures that originate in the CIAA annual reports (cite the report materials).
  ciaa: {
    complaintsYear: 28554, // 35th report, FY2081/82 — newly registered (excl. 8,472 carryover; 37,026 total workload)
    casesFiledYear: 137,
    successRatePct: 52.67, // CIAA counts full + partial as "success" (single year, volatile YoY ~33–72%)
    damagesClaimedYearBn: 6.02, // FY2081/82 damages (bigo) demanded, Rs (verified Rs 6,018,472,692)
    complaints5yr: 107050, // FY2077/78–2081/82 new registrations (5yr workload 148,235 minus 41,185 recycled backlog)
    casesFiled5yr: 744, // FY2077/78–2081/82 (113+131+162+201+137)
  },

  // --- Defendant identity resolution ---
  entityResolution: {
    defendantRows: 9321,
    distinctNames: 8114,
    resolved: 607,
  },

  // --- Over time -------------------------------------------------------------
  // Conviction/acquittal by VERDICT fiscal year and the fake-credential vs core-graft
  // decomposition; case pace + backlog by FILING-year cohort.
  overTime: {
    // Outcome + fake-credential split, keyed on the verdict FISCAL year. `fakeDisp`/
    // `fakeConv` isolate documentary fake-credential cases (the ~90%-conviction charge);
    // the remainder reads as core financial graft.
    byVerdictYear: [
      { fy: 2069, convicted: 22, partial: 4, acquitted: 6, fakeConv: 18, fakeDisp: 19 },
      { fy: 2070, convicted: 67, partial: 2, acquitted: 9, fakeConv: 60, fakeDisp: 61 },
      { fy: 2071, convicted: 84, partial: 13, acquitted: 80, fakeConv: 57, fakeDisp: 61 },
      { fy: 2072, convicted: 109, partial: 26, acquitted: 66, fakeConv: 65, fakeDisp: 82 },
      { fy: 2073, convicted: 100, partial: 23, acquitted: 43, fakeConv: 65, fakeDisp: 79 },
      { fy: 2074, convicted: 85, partial: 27, acquitted: 61, fakeConv: 30, fakeDisp: 33 },
      { fy: 2075, convicted: 157, partial: 32, acquitted: 36, fakeConv: 85, fakeDisp: 90 },
      { fy: 2076, convicted: 123, partial: 21, acquitted: 27, fakeConv: 39, fakeDisp: 40 },
      { fy: 2077, convicted: 68, partial: 23, acquitted: 43, fakeConv: 30, fakeDisp: 32 },
      { fy: 2078, convicted: 46, partial: 26, acquitted: 258, fakeConv: 25, fakeDisp: 30 },
      { fy: 2079, convicted: 112, partial: 74, acquitted: 83, fakeConv: 37, fakeDisp: 39 },
      { fy: 2080, convicted: 155, partial: 101, acquitted: 240, fakeConv: 24, fakeDisp: 26 },
      { fy: 2081, convicted: 58, partial: 28, acquitted: 42, fakeConv: 27, fakeDisp: 31 },
      { fy: 2082, convicted: 20, partial: 7, acquitted: 21, fakeConv: 6, fakeDisp: 7 },
    ] satisfies VerdictYearRow[],

    // Filing-year cohorts (fiscal): decided vs still-pending, and median months from
    // registration to verdict. Cohorts through `completeThroughFy` are essentially
    // fully adjudicated; later cohorts are still open, so their median is provisional.
    // pending sums to 169 = outcome.ongoing; decided+pending ≈ trend.filed per year.
    cohorts: [
      { fy: 2069, decided: 126, pending: 0, medianMonths: 11.0 },
      { fy: 2070, decided: 185, pending: 0, medianMonths: 13.0 },
      { fy: 2071, decided: 310, pending: 0, medianMonths: 13.0 },
      { fy: 2072, decided: 150, pending: 0, medianMonths: 15.5 },
      { fy: 2073, decided: 164, pending: 0, medianMonths: 16.0 },
      { fy: 2074, decided: 197, pending: 0, medianMonths: 14.0 },
      { fy: 2075, decided: 369, pending: 0, medianMonths: 19.0 },
      { fy: 2076, decided: 445, pending: 0, medianMonths: 30.0 },
      { fy: 2077, decided: 127, pending: 0, medianMonths: 22.0 },
      { fy: 2078, decided: 135, pending: 0, medianMonths: 19.0 },
      { fy: 2079, decided: 176, pending: 0, medianMonths: 12.0 },
      { fy: 2080, decided: 209, pending: 2, medianMonths: 5.0 },
      { fy: 2081, decided: 90, pending: 53, medianMonths: 4.0 },
      { fy: 2082, decided: 27, pending: 114, medianMonths: 3.0 },
    ] satisfies CohortRow[],

    /** Filing cohorts up to and including this fiscal year are treated as complete. */
    completeThroughFy: 2079,
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
      year: r.fy,
      total,
      convPct: total ? (r.convicted / total) * 100 : 0,
      acqPct: total ? (r.acquitted / total) * 100 : 0,
      partPct: total ? (r.partial / total) * 100 : 0,
      coreConvPct: coreDisp ? (coreConv / coreDisp) * 100 : 0,
      fakeSharePct: total ? (r.fakeDisp / total) * 100 : 0,
    };
  });
}
