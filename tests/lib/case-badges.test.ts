import { describe, it, expect } from "vitest";

import { getCaseBadgeClassName } from "@/lib/case-badges";

// The case lifecycle chip was dropped from every Jawafdehi case surface, so
// deriveCaseStatus and getCaseStatusLabelKey went with it. The status PILL
// styling below stays: court-case cards still render a status, and they read
// their colour from this same table via <CaseStatusBadge>.
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
