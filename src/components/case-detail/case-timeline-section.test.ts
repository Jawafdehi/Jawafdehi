import { describe, it, expect } from "vitest";

import { buildYearGroupHeadings, type TimelineRow } from "@/components/case-detail/case-timeline-headings";

// Build a minimal TimelineRow: only the primary/secondary year and the secondary
// calendar matter to the heading aggregation.
function row(primaryYear: string, secondaryYear: string, secondaryCalendar: "AD" | "BS" = "BS"): TimelineRow {
  return {
    date: { primary: "", primaryCalendar: "AD", secondary: "", secondaryCalendar },
    primaryDate: { label: "", year: primaryYear },
    secondaryDate: { label: "", year: secondaryYear },
  };
}

// BB-33 (Gemini follow-up): the BS-year range must be order-independent.
describe("buildYearGroupHeadings", () => {
  it("appends a single secondary-calendar year to the heading", () => {
    const headings = buildYearGroupHeadings([row("2024", "२०८१")]);
    expect(headings.get("2024")).toBe("2024 (२०८१ BS)");
  });

  it("renders a min…max range when an AD year spans two BS years (chronological)", () => {
    const headings = buildYearGroupHeadings([
      row("2025", "२०८१"),
      row("2025", "२०८२"),
    ]);
    expect(headings.get("2025")).toBe("2025 (२०८१–२०८२ BS)");
  });

  it("computes the same range when rows arrive reverse-chronologically", () => {
    // Endpoints must come from numeric min/max, not first/last-seen order.
    const headings = buildYearGroupHeadings([
      row("2025", "२०८२"),
      row("2025", "२०८१"),
    ]);
    expect(headings.get("2025")).toBe("2025 (२०८१–२०८२ BS)");
  });

  it("orders ASCII (AD) secondary years numerically regardless of input order", () => {
    const headings = buildYearGroupHeadings([
      row("२०८१", "2025", "AD"),
      row("२०८१", "2024", "AD"),
    ]);
    expect(headings.get("२०८१")).toBe("२०८१ (2024–2025 AD)");
  });

  it("falls back to the primary year alone when there is no secondary year", () => {
    const headings = buildYearGroupHeadings([
      { date: { primary: "", primaryCalendar: "AD", secondary: null, secondaryCalendar: null }, primaryDate: { label: "", year: "2024" }, secondaryDate: null },
    ]);
    expect(headings.get("2024")).toBe("2024");
  });
});
