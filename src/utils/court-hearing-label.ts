/**
 * What a court case's hearing row and decision should SAY, derived only from
 * what the court itself recorded.
 *
 * The hearing badge used to default to "Order" (आदेश) whenever a row carried
 * neither a status nor a decision. Most such rows are cause-list listings: the
 * court published that the case was LISTED for a date, nothing more. On the
 * Supreme Court about 236k rows are like that, and when checked against the
 * court's own case pages only about one in seven was actually an order. The
 * rest were "not reached", adjournments, or final orders (investigation
 * 2026-11-03, work/2026-11-03-case-pages). So the rules here are:
 *
 * - The court's STATUS column decides the label (आदेश, फैसला, हेर्न नभ्याइने …).
 * - No status and no decision means "listed for hearing", never an order.
 * - A थुनछेक (custody hearing) order is labelled by the court's own bracketed
 *   result. `(थुनामा राख्ने)` is custody, not bail, and `(साधारण तारिख)` is
 *   release on an ordinary date. Only `(धरौटी)` is bail.
 * - A status we do not recognise is shown verbatim, in both languages, rather
 *   than being mapped to something it may not mean.
 *
 * Labels are returned as i18n keys with English and Nepali fallbacks, so callers
 * can render them through `t()` and the tests can pin both languages.
 */

import type { CourtCase, CourtCaseHearing } from "@/types/jds";

export type HearingKind =
  | "listed"
  | "order"
  | "bail"
  | "custody"
  | "final"
  | "decision"
  | "notReached"
  | "adjourned"
  | "cannotHear"
  | "benchDidNotSit"
  | "partHeard"
  | "court";

export interface HearingLabel {
  kind: HearingKind;
  /** i18n key, or null when `text` is the court's own wording shown verbatim. */
  labelKey: string | null;
  /** English fallback for `labelKey` (or the court's wording, when verbatim). */
  labelFallback: string;
  /** Nepali text for the same label, so SSR/tests can check both languages. */
  labelNe: string;
  /**
   * True when the row records something the court ordered or decided. The
   * decision cell is then captioned "Order"; otherwise it is only the court's
   * note (e.g. who asked for the adjournment) and is captioned "Details".
   */
  isOrder: boolean;
}

const KEY = "courtCaseProfile.activity.";

function label(
  kind: HearingKind,
  en: string,
  ne: string,
  isOrder: boolean,
  key: string = kind,
): HearingLabel {
  return { kind, labelKey: `${KEY}${key}`, labelFallback: en, labelNe: ne, isOrder };
}

/** The labels, exported so the locale files can be checked against them. */
export const HEARING_LABELS = {
  listed: label("listed", "Listed for hearing", "सुनुवाइका लागि सूचीकृत", false),
  order: label("order", "Order", "आदेश", true),
  bail: label("bail", "Bail order", "धरौटी आदेश", true, "bailOrder"),
  final: label("final", "Final order", "अन्तिम आदेश", true, "finalOrder"),
  decision: label("decision", "Decision", "फैसला", true),
  notReached: label("notReached", "Not reached", "हेर्न नभ्याइने", false),
  adjourned: label("adjourned", "Adjourned", "स्थगित", false),
  cannotHear: label("cannotHear", "Bench could not hear", "हेर्न नमिल्ने", false),
  benchDidNotSit: label("benchDidNotSit", "Bench did not sit", "बेन्च नबसेको", false),
  partHeard: label("partHeard", "Part-heard", "हेर्दाहेर्दै", false),
} as const;

/** थुनछेक results, keyed by the court's bracketed wording. */
const CUSTODY_RESULTS: ReadonlyArray<{ match: RegExp; label: HearingLabel }> = [
  {
    match: /धरौटी/,
    label: label("bail", "Custody hearing: bail", "थुनछेक आदेश (धरौटी)", true, "custodyBail"),
  },
  {
    match: /थुनामा\s*राख्ने/,
    label: label(
      "custody",
      "Custody hearing: held in custody",
      "थुनछेक आदेश (थुनामा राख्ने)",
      true,
      "custodyHeld",
    ),
  },
  {
    match: /साधारण\s*तार[ेि]ख/,
    label: label(
      "custody",
      "Custody hearing: released on ordinary date",
      "थुनछेक आदेश (साधारण तारिख)",
      true,
      "custodyReleasedOnDate",
    ),
  },
];

/** Exported for the locale-coverage test. */
export const CUSTODY_LABELS: readonly HearingLabel[] = [
  ...CUSTODY_RESULTS.map((r) => r.label),
  label("custody", "Custody hearing order", "थुनछेक आदेश", true, "custodyOther"),
];

function custodyLabel(decision: string): HearingLabel {
  for (const { match, label: l } of CUSTODY_RESULTS) {
    if (match.test(decision)) return l;
  }
  // An unrecognised bracket: name the hearing, and let the court's own text
  // (shown under "Order") say what it decided.
  return CUSTODY_LABELS[CUSTODY_LABELS.length - 1];
}

/** Collapse whitespace; the portals pad cells liberally. */
function ws(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Same, without any spaces at all (हेर्न नभ्याइने vs हेर्ननभ्याइने). */
function despace(value: string): string {
  return value.replace(/\s+/g, "");
}

/** Statuses meaning "the court did not take the case up that day". */
const PROCEDURAL: ReadonlyArray<{ test: (s: string) => boolean; label: HearingLabel }> = [
  // Supreme writes हेर्न नभ्याइने, Special writes नभ्याउने. Both: not reached.
  { test: (s) => /नभ्याइने|नभ्याउने/.test(s) && !/बेन्च/.test(s), label: HEARING_LABELS.notReached },
  // स्थगित and the Supreme register's स्थगीत are the same word.
  { test: (s) => /स्थग[िी]त/.test(s), label: HEARING_LABELS.adjourned },
  { test: (s) => /हेर्ननमिल्ने/.test(s), label: HEARING_LABELS.cannotHear },
  { test: (s) => /बेन्चनबसेको|बेन्चबस्ननभ्याएको/.test(s), label: HEARING_LABELS.benchDidNotSit },
  { test: (s) => /^हेर्दाहेर्दै/.test(s), label: HEARING_LABELS.partHeard },
];

/** The court's wording, shown as-is in every language. */
function verbatim(status: string): HearingLabel {
  return { kind: "court", labelKey: null, labelFallback: status, labelNe: status, isOrder: false };
}

/**
 * The label for one hearing row. Only the court's status and order-type cells
 * are read; nothing is inferred from the absence of either.
 */
export function hearingLabel(
  hearing: Pick<CourtCaseHearing, "case_status" | "decision_type">,
): HearingLabel {
  const status = ws(hearing.case_status);
  const decision = ws(hearing.decision_type);
  const s = despace(status);

  if (!status && !decision) return HEARING_LABELS.listed;

  // The orders a sitting can make. A थुनछेक order is named by its result,
  // whatever the status column says (Special Court often marks the custody
  // order on an application as its अन्तिम आदेश).
  const orderStatus = !status || s === "आदेश" || s === "अन्तिमआदेश" || s.startsWith("फैसला");
  if (orderStatus && decision.includes("थुनछेक")) return custodyLabel(decision);

  if (s.startsWith("फैसला")) return HEARING_LABELS.decision;
  if (s === "अन्तिमआदेश") return HEARING_LABELS.final;
  if (s === "आदेश") {
    return decision.includes("धरौटी") ? HEARING_LABELS.bail : HEARING_LABELS.order;
  }

  if (status) {
    for (const { test, label: l } of PROCEDURAL) {
      if (test(s)) return l;
    }
    return verbatim(status);
  }

  // A decision with no status: the court's order-type column is filled, so it
  // did record an order. (Not seen in the Supreme or Special corpora; kept so a
  // future shape degrades to the court's own words rather than to nothing.)
  if (/फैसला|अन्तिम/.test(decision)) return HEARING_LABELS.final;
  return HEARING_LABELS.order;
}

/** The portal's trailing "view file" link text, captured with some cells. */
const UI_SUFFIXES = ["फाइल हेर्नुहोस्"];

/** A court cell for display: whitespace collapsed, the portal's link text dropped. */
export function courtText(value: string | null | undefined): string {
  let text = ws(value);
  for (const suffix of UI_SUFFIXES) {
    if (text.endsWith(suffix)) text = text.slice(0, -suffix.length).trim();
  }
  return text;
}

// ── the case's decision ─────────────────────────────────────────────────────

/**
 * Reader-facing names for the API's `verdict_type` enum, used only when the
 * court's own outcome text is not on the page. Worded to hold for every court
 * and case kind the enum is used for (CLAIM_DENIED is a dismissed writ, a
 * rejected application and a failed appeal alike). PROCEDURAL and OTHER say
 * nothing a reader can use, so they are not shown.
 */
export const VERDICT_LABELS: Record<string, { en: string; ne: string }> = {
  CONVICTED: { en: "Charge proved", ne: "अभियोग दाबी पुग्ने" },
  PARTIALLY_CONVICTED: { en: "Charge partly proved", ne: "आंशिक अभियोग दाबी पुग्ने" },
  ACQUITTED: { en: "Acquitted", ne: "सफाई" },
  CLAIM_UPHELD: { en: "Claim granted", ne: "दाबी/माग पुग्ने" },
  PARTIALLY_UPHELD: { en: "Claim partly granted", ne: "आंशिक दाबी पुग्ने" },
  CLAIM_DENIED: { en: "Claim not granted", ne: "दाबी/माग नपुग्ने" },
  AFFIRMED: { en: "Upheld", ne: "सदर" },
  REVERSED: { en: "Overturned", ne: "उल्टी" },
  PARTIALLY_REVERSED: { en: "Partly overturned", ne: "केही उल्टी" },
  SETTLED: { en: "Settled", ne: "मिलापत्र" },
  WITHDRAWN: { en: "Withdrawn", ne: "मुद्दा फिर्ता" },
  DISMISSED: { en: "Dismissed", ne: "डिसमिस" },
  QUASHED: { en: "Quashed", ne: "खारेज" },
  STRUCK_OFF: { en: "Struck off", ne: "लगत कट्टा" },
  ABEYANCE: { en: "Held in abeyance", ne: "मुल्तबी" },
  AMENDED: { en: "Amended", ne: "संशोधन हुने" },
};

export interface CaseDecision {
  /** The outcome as the court worded it, or the enum's label; null if unknown. */
  outcome: string | null;
  /** Where `outcome` came from, so a reviewer can tell court text from our label. */
  source: "court" | "verdict_type" | null;
}

function isDecidingStatus(status: string): boolean {
  const s = despace(ws(status));
  return s.startsWith("फैसला") || s === "अन्तिमआदेश";
}

/**
 * The case's outcome, for the summary.
 *
 * In order: the `>> outcome` part of the case status (the Special and district
 * registers write it there); the order text of the deciding sitting — the one on
 * the verdict date if we hold it, else the latest sitting the court marked
 * फैसला/अन्तिम आदेश; and last, our structured `verdict_type`. A deciding
 * sitting is only consulted on a case that is decided, because the Supreme
 * register also writes अन्तिम आदेश on plainly interlocutory orders.
 */
export function caseDecision(
  courtCase: Pick<CourtCase, "case_status" | "verdict_date_bs" | "verdict_type" | "hearings">,
): CaseDecision {
  const status = ws(courtCase.case_status);
  const arrow = status.indexOf(">>");
  if (arrow !== -1) {
    const outcome = courtText(status.slice(arrow + 2));
    if (outcome && !["undefined", "null", "-", "अन्य"].includes(outcome)) {
      return { outcome, source: "court" };
    }
  }

  if (caseIsDecided(courtCase)) {
    const hearings = courtCase.hearings ?? [];
    const onVerdictDate = courtCase.verdict_date_bs
      ? hearings.filter((h) => h.hearing_date_bs === courtCase.verdict_date_bs)
      : [];
    const deciding = [...(onVerdictDate.length ? onVerdictDate : hearings)]
      .filter((h) => isDecidingStatus(h.case_status) && courtText(h.decision_type))
      .sort((a, b) => (a.hearing_date_bs < b.hearing_date_bs ? 1 : -1))[0];
    if (deciding) return { outcome: courtText(deciding.decision_type), source: "court" };
  }

  const verdict = courtCase.verdict_type?.trim().toUpperCase();
  if (verdict && VERDICT_LABELS[verdict]) {
    return { outcome: verdict, source: "verdict_type" };
  }
  return { outcome: null, source: null };
}

/**
 * Whether we can say the case is decided without the register's case status.
 *
 * Used when `case_status` is empty (every Supreme Court row, until the scraper
 * reads it): a verdict date or a classified verdict is our record of a
 * decision, and so is a sitting the court itself marked फैसला. Nothing here can
 * make a case read as ongoing — absence of evidence is not "चलिरहेको".
 */
const PENDING_STATUSES = new Set(["चालु", "चलिरहेको", "चलीरहेको", "विचाराधीन"]);

export function caseIsDecided(
  courtCase: Pick<CourtCase, "case_status" | "verdict_date_bs" | "verdict_type" | "hearings">,
): boolean {
  const status = despace(ws(courtCase.case_status));
  // The register says the case is live: believe it over any older sitting.
  if (PENDING_STATUSES.has(status)) return false;
  if (status.startsWith("फैसला") || status.includes(">>") || status.startsWith("अन्तिमआदेश")) {
    return true;
  }
  if (courtCase.verdict_date_bs) return true;
  const verdict = courtCase.verdict_type?.trim().toUpperCase();
  if (verdict && VERDICT_LABELS[verdict]) return true;
  return (courtCase.hearings ?? []).some((h) => despace(ws(h.case_status)).startsWith("फैसला"));
}
