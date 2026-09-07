import { describe, it, expect } from "vitest";

import {
  deriveCaseStatus,
  getCaseBadgeClassName,
  getCaseStatusLabelKey,
} from "@/lib/case-badges";

// BB-32: a published case that carries a trial verdict date has concluded and
// must not read "Ongoing". Draft/in-review keep their workflow state; CLOSED
// wins. A pending Supreme Court appeal outranks the trial verdict.
describe("deriveCaseStatus", () => {
  it("marks a published case with a trial end date as concluded", () => {
    expect(deriveCaseStatus("PUBLISHED", { trial_end_date: "2023-06-09" })).toBe("concluded");
  });

  it("leaves a published case without a trial end date as published (ongoing)", () => {
    expect(deriveCaseStatus("PUBLISHED", { trial_end_date: null })).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", { trial_end_date: "" })).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", { trial_end_date: "   " })).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", {})).toBe("PUBLISHED");
  });

  it("treats a missing state with a trial end date as concluded, else published", () => {
    expect(deriveCaseStatus(null, { trial_end_date: "2023-06-09" })).toBe("concluded");
    expect(deriveCaseStatus(undefined, {})).toBe("PUBLISHED");
  });

  it("keeps draft and in-review states even when an end date is present", () => {
    expect(deriveCaseStatus("DRAFT", { trial_end_date: "2023-06-09" })).toBe("DRAFT");
    expect(deriveCaseStatus("IN_REVIEW", { trial_end_date: "2023-06-09" })).toBe("IN_REVIEW");
  });

  it("keeps an explicit CLOSED state", () => {
    expect(deriveCaseStatus("CLOSED", {})).toBe("CLOSED");
  });

  it("is case- and separator-insensitive for the workflow state", () => {
    expect(deriveCaseStatus("draft", { trial_end_date: "2023-06-09" })).toBe("DRAFT");
    expect(deriveCaseStatus("In_Review", { trial_end_date: "2023-06-09" })).toBe("IN_REVIEW");
    expect(deriveCaseStatus("in-review", {})).toBe("IN_REVIEW");
    expect(deriveCaseStatus("closed", {})).toBe("CLOSED");
    // A lowercase published state with an end date still concludes.
    expect(deriveCaseStatus("published", { trial_end_date: "2023-06-09" })).toBe("concluded");
    expect(deriveCaseStatus("published", {})).toBe("PUBLISHED");
  });

  it("passes an unrecognized state through", () => {
    expect(deriveCaseStatus("ARCHIVED", {})).toBe("ARCHIVED");
  });

  it("reads a pending appeal as under_appeal, whatever the trial dates say", () => {
    // The verdict was appealed, so the case is live again at the Supreme Court
    // and the trial end date must not make it read "Concluded".
    expect(
      deriveCaseStatus("PUBLISHED", {
        trial_end_date: "2023-06-09",
        appeal_start_date: "2023-07-02",
      }),
    ).toBe("under_appeal");
    expect(
      deriveCaseStatus("PUBLISHED", {
        trial_end_date: "2023-06-09",
        appeal_start_date: "2023-07-02",
        appeal_end_date: null,
      }),
    ).toBe("under_appeal");
    // An appeal registered before the trial verdict landed in the record.
    expect(deriveCaseStatus("PUBLISHED", { appeal_start_date: "2023-07-02" })).toBe(
      "under_appeal",
    );
  });

  it("reads a decided appeal as concluded", () => {
    expect(
      deriveCaseStatus("PUBLISHED", {
        trial_end_date: "2023-06-09",
        appeal_start_date: "2023-07-02",
        appeal_end_date: "2024-01-15",
      }),
    ).toBe("concluded");
  });

  it("treats a blank appeal start as no appeal at all", () => {
    expect(
      deriveCaseStatus("PUBLISHED", { trial_end_date: "2023-06-09", appeal_start_date: "  " }),
    ).toBe("concluded");
    expect(
      deriveCaseStatus("PUBLISHED", { trial_end_date: "2023-06-09", appeal_start_date: "" }),
    ).toBe("concluded");
  });

  it("keeps a draft case DRAFT even with a pending appeal", () => {
    expect(
      deriveCaseStatus("DRAFT", {
        trial_end_date: "2023-06-09",
        appeal_start_date: "2023-07-02",
      }),
    ).toBe("DRAFT");
  });
});

describe("getCaseStatusLabelKey", () => {
  it("maps concluded to its own i18n label key", () => {
    expect(getCaseStatusLabelKey("concluded")).toBe("caseDetail.status.concluded");
  });

  it("keeps the existing published/closed mappings", () => {
    expect(getCaseStatusLabelKey("PUBLISHED")).toBe("caseDetail.status.ongoing");
    expect(getCaseStatusLabelKey("CLOSED")).toBe("caseDetail.status.resolved");
  });

  it("labels the appeal status in both separator forms", () => {
    expect(getCaseStatusLabelKey("under_appeal")).toBe("caseDetail.status.underAppeal");
    expect(getCaseStatusLabelKey("under-appeal")).toBe("caseDetail.status.underAppeal");
  });
});

describe("getCaseBadgeClassName for a concluded status", () => {
  it("uses the success (green) pill, not the alert (orange) pill", () => {
    const concluded = getCaseBadgeClassName("status", "concluded");
    expect(concluded).toContain("bg-success-strong");
    expect(concluded).toContain("text-white");
    expect(concluded).not.toContain("bg-alert");
  });

  it("keeps the alert pill for an ongoing/published status", () => {
    const published = getCaseBadgeClassName("status", "PUBLISHED");
    expect(published).toContain("bg-alert-strong");
    expect(published).toContain("text-white");
  });

  it("gives a case under appeal the live (alert) pill, not the muted one", () => {
    const underAppeal = getCaseBadgeClassName("status", "under_appeal");
    expect(underAppeal).toContain("bg-alert-strong");
    expect(underAppeal).not.toContain("bg-muted");
  });
});
