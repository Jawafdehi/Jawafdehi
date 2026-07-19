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

// In-platform citation targets. Each is a real public page on jawafdehi.org.
export const CITATIONS = {
  ciaa35: "https://jawafdehi.org/material/ciaa_annual_report/ee0b4f80b24b8665",
  ciaa34: "https://jawafdehi.org/material/ciaa_annual_report/9ad112a186a0b4ed",
  ciaa33: "https://jawafdehi.org/material/ciaa_annual_report/8b781a41a6138292",
  ciaa32:
    "https://jawafdehi.org/material/ciaa_annual_report/4._32nd_annual_report_2078_079_fek7bv_ba92e14e",
  /** The whole CIAA annual-report series (41 materials). */
  ciaaReports: "https://jawafdehi.org/materials?source=ciaa_annual_report",
  /** CIAA charge-sheet-filing announcements (3,438 press releases). */
  ciaaPressReleases: "https://jawafdehi.org/materials?material_type=press_release",
  /** AG abhiyog-patra (charge sheets, 99,783). */
  chargeSheets: "https://jawafdehi.org/materials?material_type=charge_sheet",
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

  // --- Funnel (CIAA annual report + our court records) ---
  // Complaint + prosecution counts from the CIAA 35th annual report (FY 2081/82);
  // the conviction stage applies our measured 46% full-conviction rate to the filed count.
  funnel: [
    { key: "complaints", count: 37026, source: "ciaa35" },
    { key: "filed", count: 137, source: "ciaa35" },
    { key: "convicted", count: 63, source: "courtRecords" },
  ] satisfies FunnelStageData[],

  // Figures that originate in the CIAA annual reports (cite the report materials).
  ciaa: {
    complaintsYear: 37026, // 35th report, FY 2081/82
    casesFiledYear: 137,
    successRatePct: 52.67, // CIAA counts full + partial as "success"
    damagesClaimed5yrBn: 31.5, // 5-year cumulative, Rs
    complaints5yr: 166520,
    casesFiled5yr: 798,
  },

  // --- Defendant identity resolution (Q10) ---
  entityResolution: {
    defendantRows: 19222,
    distinctNames: 8384,
    resolved: 607,
  },
} as const;

/** Derived: share (%) of a single outcome within a charge row. */
export function outcomePct(row: OutcomeCounts, key: keyof OutcomeCounts): number {
  const total = row.convicted + row.partial + row.acquitted;
  return total ? (row[key] / total) * 100 : 0;
}
