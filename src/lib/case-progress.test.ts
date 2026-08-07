import { describe, expect, it } from "vitest";

import { APPEAL_WINDOW_DAYS, deriveCaseProgress } from "./case-progress";
import type { CourtCase, CourtCaseHearing } from "@/types/jds";

const NOW = new Date("2026-08-07T00:00:00Z");

function docket(over: Partial<CourtCase> & Pick<CourtCase, "case_number" | "court_identifier">): CourtCase {
  return {
    registration_date_bs: null,
    registration_date_ad: null,
    case_type: null,
    division: null,
    category: null,
    section: null,
    plaintiff: null,
    defendant: null,
    original_case_number: "",
    case_id: null,
    priority: null,
    registration_number: "",
    case_status: null,
    verdict_type: null,
    verdict_date_bs: null,
    verdict_date_ad: null,
    verdict_judge: null,
    status: "enriched",
    ...over,
  };
}

function hearing(over: Partial<CourtCaseHearing>): CourtCaseHearing {
  return {
    id: 1,
    case_number: "x",
    court_identifier: "special",
    hearing_date_bs: "2082-01-01",
    hearing_date_ad: "2025-04-14",
    bench: null,
    bench_type: "",
    judge_names: null,
    lawyer_names: null,
    serial_no: "1",
    case_status: "आदेश",
    decision_type: "",
    remarks: "",
    ...over,
  };
}

/** The real shape of `special/080-CR-0067` — charge filed, acquitted, appealed, affirmed. */
const TRIAL_ACQUITTED = docket({
  case_number: "080-CR-0067",
  court_identifier: "special",
  registration_date_bs: "2080-08-06",
  registration_date_ad: "2023-11-22",
  verdict_type: "ACQUITTED",
  verdict_date_bs: "2081-02-23",
  verdict_date_ad: "2024-06-05",
});

describe("deriveCaseProgress", () => {
  it("returns null when there is no Special Court -CR- docket", () => {
    // 13 of 62 published cases; an empty stepper would claim a structure we
    // have not verified, so those pages must render as they do today.
    expect(deriveCaseProgress([], NOW)).toBeNull();
    expect(
      deriveCaseProgress([docket({ case_number: "080-C4-2408", court_identifier: "kathmandudc" })], NOW),
    ).toBeNull();
  });

  it("does not mistake a same-numbered Supreme docket for the trial court", () => {
    // 080-CR-0067 exists at BOTH `special` and `supreme` as unrelated cases, so
    // matching on the docket number alone would pick the wrong forum.
    const progress = deriveCaseProgress(
      [docket({ case_number: "080-CR-0067", court_identifier: "supreme" })],
      NOW,
    );
    expect(progress).toBeNull();
  });

  it("reads a charge filed with no hearings yet as charge_filed", () => {
    const progress = deriveCaseProgress(
      [docket({ case_number: "081-CR-0138", court_identifier: "special", registration_date_bs: "2082-03-25" })],
      NOW,
    );
    expect(progress?.stage).toBe("charge_filed");
  });

  it("reads an undecided docket with hearings as trial", () => {
    const progress = deriveCaseProgress(
      [
        docket({
          case_number: "081-CR-0104",
          court_identifier: "special",
          case_status: "चलिरहेको",
          hearings: [hearing({ case_status: "आदेश", decision_type: "जवाफ माग्ने" })],
        }),
      ],
      NOW,
    );
    expect(progress?.stage).toBe("trial");
  });

  it("finds the verdict on a hearing when the case row is stale", () => {
    // 081-CR-0091 (bara-hulak): case_status still reads चलिरहेको and every
    // verdict column is NULL, while a फैसला hearing carries आंशिक ठहर. This is
    // 9 of the 49 dockets; reading only the case row reports them as on trial.
    const progress = deriveCaseProgress(
      [
        docket({
          case_number: "081-CR-0091",
          court_identifier: "special",
          case_status: "चलिरहेको",
          hearings: [
            hearing({ hearing_date_bs: "2082-09-01", case_status: "आदेश", decision_type: "जवाफ माग्ने" }),
            hearing({
              hearing_date_bs: "2082-10-22",
              hearing_date_ad: "2026-02-05",
              case_status: "फैसला",
              decision_type: "आंशिक ठहर",
            }),
          ],
        }),
      ],
      NOW,
    );
    expect(progress?.stage).toBe("no_appeal_recorded");
    expect(progress?.nodes.find((n) => n.key === "trial_verdict")?.verdict).toBe("PARTIALLY_CONVICTED");
  });

  it("does not record a partial conviction as a full one", () => {
    // `आंशिक ठहर` contains `ठहर`. Testing ठहर first is the exact bug that put
    // 593 wrong rows in the lake, so pin the ordering.
    const partial = deriveCaseProgress(
      [
        docket({
          case_number: "081-CR-0080",
          court_identifier: "special",
          hearings: [hearing({ case_status: "फैसला", decision_type: "आंशिक ठहर" })],
        }),
      ],
      NOW,
    );
    expect(partial?.nodes.find((n) => n.key === "trial_verdict")?.verdict).toBe("PARTIALLY_CONVICTED");

    const full = deriveCaseProgress(
      [
        docket({
          case_number: "081-CR-0127",
          court_identifier: "special",
          hearings: [hearing({ case_status: "फैसला", decision_type: "ठहर" })],
        }),
      ],
      NOW,
    );
    expect(full?.nodes.find((n) => n.key === "trial_verdict")?.verdict).toBe("CONVICTED");
  });

  it("keeps a fresh verdict inside the appeal window", () => {
    const recent = new Date(NOW);
    recent.setDate(recent.getDate() - 10);
    const progress = deriveCaseProgress(
      [{ ...TRIAL_ACQUITTED, verdict_date_ad: recent.toISOString().slice(0, 10) }],
      NOW,
    );
    expect(progress?.stage).toBe("appeal_window");
    expect(progress?.appealDaysRemaining).toBe(APPEAL_WINDOW_DAYS - 10);
  });

  it("says no appeal is RECORDED once the window has closed", () => {
    // Never "final": there is no column linking a Supreme docket to its Special
    // Court original, so "not appealed" and "not yet found" are indistinguishable.
    const progress = deriveCaseProgress([TRIAL_ACQUITTED], NOW);
    expect(progress?.stage).toBe("no_appeal_recorded");
    expect(progress?.nodes.find((n) => n.key === "appeal_filed")?.unknown).toBe(true);
  });

  it("reads a linked Supreme docket with no outcome as appeal_pending", () => {
    // 12 of our 14 linked appeals are in this state.
    const progress = deriveCaseProgress(
      [
        TRIAL_ACQUITTED,
        docket({ case_number: "081-CR-1027", court_identifier: "supreme", registration_date_bs: "2081-08-11" }),
      ],
      NOW,
    );
    expect(progress?.stage).toBe("appeal_pending");
    expect(progress?.nodes.find((n) => n.key === "appeal_verdict")?.unknown).toBe(true);
  });

  it("reads a promoted appellate outcome as appeal_decided", () => {
    const progress = deriveCaseProgress(
      [
        TRIAL_ACQUITTED,
        docket({
          case_number: "081-CR-1038",
          court_identifier: "supreme",
          registration_date_bs: "2081-08-11",
          verdict_type: "AFFIRMED",
          verdict_date_bs: "2082-03-20",
          verdict_date_ad: "2025-07-04",
        }),
      ],
      NOW,
    );
    expect(progress?.stage).toBe("appeal_decided");
    expect(progress?.nodes.find((n) => n.key === "appeal_verdict")?.verdict).toBe("AFFIRMED");
  });

  it("ignores a non-terminal verdict_type the API could not classify", () => {
    // The API nulls raw portal text, but a value outside the appellate axis
    // (say a trial enum on a Supreme row) must not read as an appeal outcome.
    const progress = deriveCaseProgress(
      [
        TRIAL_ACQUITTED,
        docket({ case_number: "080-CR-0081", court_identifier: "supreme", verdict_type: "PROCEDURAL" }),
      ],
      NOW,
    );
    expect(progress?.stage).toBe("appeal_pending");
  });

  it("prefers the promoted column over the hearing fallback", () => {
    const progress = deriveCaseProgress(
      [
        docket({
          case_number: "080-CR-0067",
          court_identifier: "special",
          verdict_type: "ACQUITTED",
          verdict_date_bs: "2081-02-23",
          verdict_date_ad: "2024-06-05",
          hearings: [hearing({ case_status: "फैसला", decision_type: "ठहर" })],
        }),
      ],
      NOW,
    );
    expect(progress?.nodes.find((n) => n.key === "trial_verdict")?.verdict).toBe("ACQUITTED");
  });
});
