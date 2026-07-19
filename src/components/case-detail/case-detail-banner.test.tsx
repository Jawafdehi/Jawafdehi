import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import type { CaseDetail } from "@/types/jds";
import { CaseDetailBanner } from "@/components/case-detail/case-detail-banner";

// Passthrough translations so assertions don't depend on i18n resources
// (mirrors case-overview-section.test.tsx). t() returns its fallback or the key.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : key,
    i18n: { language: "en" },
  }),
}));

const SHORT_DESC = "A concise one-line summary of what this case is about.";

const makeCase = (overrides: Partial<CaseDetail> = {}): CaseDetail => ({
  id: 7,
  slug: "test-case",
  case_type: "CORRUPTION",
  state: "PUBLISHED",
  title: "Test case title",
  short_description: SHORT_DESC,
  case_start_date: null,
  case_end_date: null,
  entities: [],
  tags: [],
  key_allegations: [],
  court_cases: [],
  bigo: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  description: "",
  timeline: [],
  evidence: [],
  notes: "",
  public_notes: "",
  missing_details: null,
  ...overrides,
});

const renderBanner = (caseData: CaseDetail) =>
  render(
    <MemoryRouter>
      <CaseDetailBanner caseData={caseData} resolvedEntities={{}} />
    </MemoryRouter>,
  );

describe("CaseDetailBanner short_description deck (#6)", () => {
  it("renders the short description as a lead at the top of the case", () => {
    renderBanner(makeCase());
    expect(screen.getByText(SHORT_DESC)).toBeTruthy();
    // Still alongside the title.
    expect(screen.getByText("Test case title")).toBeTruthy();
  });

  it("omits the deck when short_description is only whitespace", () => {
    const { container } = renderBanner(makeCase({ short_description: "   " }));
    expect(container.textContent).not.toContain(SHORT_DESC);
    expect(screen.getByText("Test case title")).toBeTruthy();
  });

  it("omits the deck when short_description is null", () => {
    renderBanner(makeCase({ short_description: null }));
    expect(screen.getByText("Test case title")).toBeTruthy();
  });
});

describe("CaseDetailBanner public_notes byline (on-screen)", () => {
  it("renders the public_notes byline on screen (not just in the print block)", () => {
    renderBanner(makeCase({ public_notes: "Case drafted by the casework team." }));
    const byline = screen.getByTestId("case-byline");
    expect(byline).toBeTruthy();
    expect(byline.textContent).toContain("Case drafted by the casework team.");
  });

  it("renders nothing when public_notes is empty", () => {
    renderBanner(makeCase({ public_notes: "" }));
    expect(screen.queryByTestId("case-byline")).toBeNull();
  });
});
