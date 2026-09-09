import type { CourtCase, CourtCaseHearing } from "@/types/jds";

/**
 * Where a CIAA corruption case sits on its journey through the courts.
 *
 * A Jawafdehi case used to say only "ongoing" or "resolved", derived from
 * whether `case_end_date` was set. That field is written with the Special
 * Court's फैसला date, so a case "ended" the moment the trial court ruled and
 * an appeal to the Supreme Court was invisible by construction. Measured
 * 2026-08-06, that put the wrong badge on 20 of the 49 published cases backed
 * by a `special/*-CR-*` docket — 12 of them reading "Resolved" while a CIAA
 * appeal was live.
 *
 * This derives the stage from the linked dockets instead, so it moves when the
 * court record moves. It is deliberately a statement about OUR RECORD, never
 * about the case: `no_appeal_recorded` means we hold no appeal, not that none
 * was filed. There is no column linking a Supreme docket back to its Special
 * Court original, so we genuinely cannot tell those apart.
 */
export type CaseStage =
  | "charge_filed"
  | "trial"
  | "appeal_window"
  | "no_appeal_recorded"
  | "appeal_pending"
  | "appeal_decided";

/** Terminal trial outcomes, as `CourtCase.verdict_type` spells them. */
const TRIAL_VERDICTS = new Set(["CONVICTED", "ACQUITTED", "PARTIALLY_CONVICTED"]);

/** Terminal appellate outcomes. An appellate bench acts on the decision below. */
const APPELLATE_VERDICTS = new Set(["AFFIRMED", "REVERSED", "PARTIALLY_REVERSED"]);

/**
 * Hearing rows whose `case_status` means the bench actually disposed of the case.
 * Mirrors `_HEARING_TERMINAL_STATUSES` in the API's `courts/case_status.py`.
 */
const TERMINAL_HEARING_STATUSES = new Set(["फैसला", "अन्तिम आदेश"]);

/**
 * Map a hearing's `decision_type` to a verdict.
 *
 * ORDER IS LOAD-BEARING: `आंशिक ठहर` contains `ठहर`, so a substring test for
 * `ठहर` first would record every partial conviction as a full one. The API's
 * `_HEARING_DECISION_MAP` carries the same warning, and 593 rows in the lake
 * already hold that exact error from before it was fixed there.
 */
function verdictFromDecisionType(decisionType: string | null | undefined): string | null {
  const text = (decisionType || "").trim();
  if (!text) return null;
  if (text.includes("आंशिक")) return "PARTIALLY_CONVICTED";
  if (text.includes("सफाई") || text.includes("सफाइ")) return "ACQUITTED";
  if (text.includes("ठहर")) return "CONVICTED";
  return null;
}

/**
 * Statutory period to appeal a Special Court decision to the Supreme Court:
 * 35 days under विशेष अदालत ऐन, २०५९ दफा १७.
 *
 * NOT the 70-day general government-case period — नि.नं. ७२२० holds that the
 * later Act's own provision displaces it for Special Court matters.
 */
export const APPEAL_PERIOD_DAYS = 35;

/**
 * Outer bound before we stop expecting an appeal: the 35 statutory days plus
 * the maximum 15-day extension दफा ११ allows for causes beyond a party's
 * control.
 *
 * Days 36–50 are NOT "the appeal window" — they only exist if an extension was
 * granted, and we hold no evidence either way. The two phases therefore get
 * different copy: a countdown inside the statutory period, and a plainly
 * conditional statement after it. Reporting "15 days remain under s.17" on day
 * 40 would assert both a deadline that has passed and an extension we never saw.
 */
export const APPEAL_WINDOW_DAYS = APPEAL_PERIOD_DAYS + 15;

export interface StageNode {
  key: string;
  /** Which court owns this step. */
  forum: "ciaa" | "special" | "supreme";
  /** Reached and evidenced. */
  done: boolean;
  /** Where the case sits right now. */
  current: boolean;
  /** Reached, but we hold no outcome for it — drawn hollow on a dashed rail. */
  unknown?: boolean;
  dateAd?: string | null;
  dateBs?: string | null;
  /** `verdict_type` for the step that produced one. */
  verdict?: string | null;
}

export interface CaseProgress {
  stage: CaseStage;
  nodes: StageNode[];
  trialDocket: CourtCase;
  appealDocket?: CourtCase;
  /** Days left in the 35-day statutory period. Only set inside that period. */
  appealDaysRemaining?: number;
  /**
   * The statutory period has lapsed but the दफा ११ extension could still be
   * running. Distinct from `appealDaysRemaining` because we cannot count down
   * an extension nobody has told us was granted.
   */
  appealExtensionPossible?: boolean;
}

interface TrialOutcome {
  verdict: string | null;
  dateBs: string | null;
  dateAd: string | null;
  /** Hearings could not be loaded, so "no verdict" is unproven, not a fact. */
  indeterminate?: boolean;
}

/** Terminal verdict for a docket: the typed column first, hearings as fallback. */
function trialOutcome(docket: CourtCase): TrialOutcome {
  // The promoted column is authoritative when present.
  if (docket.verdict_type && TRIAL_VERDICTS.has(docket.verdict_type)) {
    return {
      verdict: docket.verdict_type,
      dateBs: docket.verdict_date_bs ?? null,
      dateAd: docket.verdict_date_ad ?? null,
    };
  }
  // No typed verdict, so the hearings decide it — and we must know we actually
  // have them. `undefined` means the sub-resource request failed; treating that
  // as "no hearings" would let a transient error report a decided case as still
  // on trial. `[]` means loaded and genuinely none, which IS evidence.
  if (docket.hearings === undefined) {
    return { verdict: null, dateBs: null, dateAd: null, indeterminate: true };
  }
  // Fallback: the verdict lands on the HEARING row and the case row is never
  // updated. 9 of the 49 published-case dockets are in exactly that state —
  // case_status still reads चलिरहेको while a फैसला hearing carries the outcome.
  // Reading only the case row would report those cases as still on trial.
  const terminal = [...docket.hearings]
    .filter((h) => TERMINAL_HEARING_STATUSES.has((h.case_status || "").trim()))
    .sort((a, b) => (a.hearing_date_bs || "").localeCompare(b.hearing_date_bs || ""))
    .pop();
  if (!terminal) return { verdict: null, dateBs: null, dateAd: null };
  return {
    verdict: verdictFromDecisionType(terminal.decision_type),
    dateBs: terminal.hearing_date_bs ?? null,
    dateAd: terminal.hearing_date_ad ?? null,
  };
}

function daysSince(dateAd: string | null | undefined, now: Date): number | null {
  if (!dateAd) return null;
  const then = new Date(dateAd);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

function isSpecialCr(c: CourtCase): boolean {
  return c.court_identifier === "special" && c.case_number.toUpperCase().includes("-CR-");
}

/**
 * Build the progress ladder from a case's linked dockets, or `null` when this
 * is not a CIAA/Special Court prosecution.
 *
 * Returning null rather than a generic ladder is deliberate: 13 of 62 published
 * cases have no `special/*-CR-*` docket (9 have no docket at all), and an empty
 * stepper would claim a structure we have not verified. Those pages render as
 * they do today.
 */
export function deriveCaseProgress(
  courtCases: CourtCase[],
  now: Date = new Date(),
): CaseProgress | null {
  // Key on (court_identifier, case_number), never the docket number alone:
  // 080-CR-0067 exists at BOTH `special` and `supreme` as unrelated cases.
  const trialDocket = courtCases
    .filter(isSpecialCr)
    .sort((a, b) => (a.registration_date_bs || "").localeCompare(b.registration_date_bs || ""))[0];
  if (!trialDocket) return null;

  // Appeal from the Special Court lies DIRECTLY to the Supreme Court
  // (विशेष अदालत ऐन, २०५९ दफा १७) — no intermediate forum to model.
  const appealDocket = courtCases
    .filter((c) => c.court_identifier === "supreme")
    .sort((a, b) => (a.registration_date_bs || "").localeCompare(b.registration_date_bs || ""))[0];

  const trial = trialOutcome(trialDocket);
  // Without hearings we cannot tell "no verdict yet" from "verdict we could not
  // read", and every downstream stage hangs off that. Render nothing rather
  // than pick one — a wrong stage is worse than no stage.
  if (trial.indeterminate) return null;

  const appealVerdict =
    appealDocket?.verdict_type && APPELLATE_VERDICTS.has(appealDocket.verdict_type)
      ? appealDocket.verdict_type
      : null;

  let stage: CaseStage;
  let appealDaysRemaining: number | undefined;
  let appealExtensionPossible: boolean | undefined;
  if (!trial.verdict) {
    // Registration at the Special Court IS the charge filing, so a case with no
    // hearings yet is still at the filing step rather than in trial.
    stage = (trialDocket.hearings ?? []).length > 0 ? "trial" : "charge_filed";
  } else if (appealVerdict) {
    stage = "appeal_decided";
  } else if (appealDocket) {
    stage = "appeal_pending";
  } else {
    const elapsed = daysSince(trial.dateAd, now);
    if (elapsed !== null && elapsed <= APPEAL_PERIOD_DAYS) {
      // Inside the statutory period — a real deadline we can count down.
      stage = "appeal_window";
      appealDaysRemaining = Math.max(0, APPEAL_PERIOD_DAYS - elapsed);
    } else if (elapsed !== null && elapsed <= APPEAL_WINDOW_DAYS) {
      // Past दफा १७ but inside the maximum दफा ११ extension. Say only that an
      // appeal may still be filed; do not count down an extension we never saw.
      stage = "appeal_window";
      appealExtensionPossible = true;
    } else {
      stage = "no_appeal_recorded";
    }
  }

  const decided = Boolean(trial.verdict);
  const nodes: StageNode[] = [
    {
      key: "charge_filed",
      forum: "ciaa",
      done: true,
      current: stage === "charge_filed",
      dateAd: trialDocket.registration_date_ad,
      dateBs: trialDocket.registration_date_bs,
    },
    {
      key: "trial",
      forum: "special",
      done: decided || (trialDocket.hearings ?? []).length > 0,
      current: stage === "trial",
    },
    {
      key: "trial_verdict",
      forum: "special",
      done: decided,
      current: stage === "appeal_window" || stage === "no_appeal_recorded",
      dateAd: trial.dateAd,
      dateBs: trial.dateBs,
      verdict: trial.verdict,
    },
  ];

  // Only draw the appeal steps once the trial has produced something to appeal.
  if (decided) {
    nodes.push({
      key: "appeal_filed",
      forum: "supreme",
      done: Boolean(appealDocket),
      current: stage === "appeal_pending",
      // We hold no appeal record and the window has closed — say so, rather
      // than calling the case final.
      unknown: !appealDocket && stage === "no_appeal_recorded",
      dateAd: appealDocket?.registration_date_ad,
      dateBs: appealDocket?.registration_date_bs,
    });
    if (appealDocket) {
      nodes.push({
        key: "appeal_verdict",
        forum: "supreme",
        done: Boolean(appealVerdict),
        current: stage === "appeal_decided",
        // The appeal is on record but NGM holds no outcome for it — true for 12
        // of our 14 linked appeals. Hollow node, not a silent omission.
        unknown: !appealVerdict,
        dateAd: appealDocket.verdict_date_ad,
        dateBs: appealDocket.verdict_date_bs,
        verdict: appealVerdict,
      });
    }
  }

  return { stage, nodes, trialDocket, appealDocket, appealDaysRemaining, appealExtensionPossible };
}
