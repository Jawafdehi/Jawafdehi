import { describe, it, expect } from "vitest";

import {
  deriveCaseStatus,
  getCaseBadgeClassName,
  getCaseStatusLabelKey,
} from "@/lib/case-badges";

// The lifecycle is DERIVED SERVER-SIDE and served as `status`. It used to be
// guessed here from the presence of an end date, which a case running twelve
// dockets across eight courts has no single one of. The workflow states
// (DRAFT / IN_REVIEW) still win, because that chip is reviewer-facing and says
// something about our publication, not about the proceedings.
describe("deriveCaseStatus", () => {
  it("takes the lifecycle from the API for a published case", () => {
    expect(deriveCaseStatus("PUBLISHED", "concluded")).toBe("concluded");
    expect(deriveCaseStatus("PUBLISHED", "ongoing")).toBe("ongoing");
    expect(deriveCaseStatus("PUBLISHED", "under_investigation")).toBe(
      "under_investigation",
    );
    expect(deriveCaseStatus("PUBLISHED", "withdrawn")).toBe("withdrawn");
    expect(deriveCaseStatus("PUBLISHED", "dormant")).toBe("dormant");
    expect(deriveCaseStatus("PUBLISHED", "others")).toBe("others");
  });

  it("falls back to the workflow state when the API served no status", () => {
    // Cached payloads and pre-deploy responses predate the field.
    expect(deriveCaseStatus("PUBLISHED", null)).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", "")).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", "   ")).toBe("PUBLISHED");
    expect(deriveCaseStatus("PUBLISHED", undefined)).toBe("PUBLISHED");
    expect(deriveCaseStatus(undefined, undefined)).toBe("PUBLISHED");
    expect(deriveCaseStatus(null, "concluded")).toBe("concluded");
  });

  it("keeps draft and in-review states whatever the proceedings say", () => {
    expect(deriveCaseStatus("DRAFT", "concluded")).toBe("DRAFT");
    expect(deriveCaseStatus("IN_REVIEW", "concluded")).toBe("IN_REVIEW");
  });

  it("keeps an explicit CLOSED state", () => {
    expect(deriveCaseStatus("CLOSED", "ongoing")).toBe("CLOSED");
  });

  it("is case- and separator-insensitive for the workflow state", () => {
    expect(deriveCaseStatus("draft", "concluded")).toBe("DRAFT");
    expect(deriveCaseStatus("In_Review", "concluded")).toBe("IN_REVIEW");
    expect(deriveCaseStatus("in-review", null)).toBe("IN_REVIEW");
    expect(deriveCaseStatus("closed", null)).toBe("CLOSED");
    expect(deriveCaseStatus("published", "concluded")).toBe("concluded");
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

  it("labels every value the API's lifecycle vocabulary can hold", () => {
    expect(getCaseStatusLabelKey("ongoing")).toBe("caseDetail.status.ongoing");
    expect(getCaseStatusLabelKey("under_investigation")).toBe(
      "caseDetail.status.underInvestigation",
    );
    expect(getCaseStatusLabelKey("others")).toBe(
      "caseDetail.status.underInvestigation",
    );
    expect(getCaseStatusLabelKey("withdrawn")).toBe("caseDetail.status.withdrawn");
    expect(getCaseStatusLabelKey("dormant")).toBe("caseDetail.status.dormant");
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

  it("gives the undecided lifecycles the muted pill, not a verdict colour", () => {
    // Withdrawn and dormant are neither a win nor a loss; colouring them green
    // would read as "resolved" on a case nobody decided.
    for (const status of ["withdrawn", "dormant", "under_investigation"]) {
      const pill = getCaseBadgeClassName("status", status);
      expect(pill, status).toContain("bg-muted");
      expect(pill, status).not.toContain("bg-success-strong");
    }
  });
});
