import { describe, it, expect } from "vitest";

import {
  deriveCaseStatus,
  getCaseBadgeClassName,
  getCaseStatusLabelKey,
} from "@/lib/case-badges";

// BB-32: a published case that carries a `case_end_date` has concluded and must
// not read "Ongoing". Draft/in-review keep their workflow state; CLOSED wins.
describe("deriveCaseStatus", () => {
  it("marks a published case with an end date as concluded", () => {
    expect(deriveCaseStatus("PUBLISHED", "2023-06-09")).toBe("concluded");
  });

  it("leaves a published case without an end date as published (ongoing)", () => {
    expect(deriveCaseStatus("PUBLISHED", null)).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", "")).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", "   ")).toBe("PUBLISHED");
  });

  it("treats a missing state with an end date as concluded, else published", () => {
    expect(deriveCaseStatus(null, "2023-06-09")).toBe("concluded");
    expect(deriveCaseStatus(undefined, null)).toBe("PUBLISHED");
  });

  it("keeps draft and in-review states even when an end date is present", () => {
    expect(deriveCaseStatus("DRAFT", "2023-06-09")).toBe("DRAFT");
    expect(deriveCaseStatus("IN_REVIEW", "2023-06-09")).toBe("IN_REVIEW");
  });

  it("keeps an explicit CLOSED state", () => {
    expect(deriveCaseStatus("CLOSED", null)).toBe("CLOSED");
  });

  it("is case- and separator-insensitive for the workflow state", () => {
    expect(deriveCaseStatus("draft", "2023-06-09")).toBe("DRAFT");
    expect(deriveCaseStatus("In_Review", "2023-06-09")).toBe("IN_REVIEW");
    expect(deriveCaseStatus("in-review", null)).toBe("IN_REVIEW");
    expect(deriveCaseStatus("closed", null)).toBe("CLOSED");
    // A lowercase published state with an end date still concludes.
    expect(deriveCaseStatus("published", "2023-06-09")).toBe("concluded");
    expect(deriveCaseStatus("published", null)).toBe("PUBLISHED");
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
});
