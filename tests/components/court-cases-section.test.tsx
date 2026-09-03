import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CourtCasesSection } from "@/components/case-detail/court-cases-section";
import type { CourtCase } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: "en" },
  }),
}));

const courtCase = {
  case_number: "080-C4-2408",
  court_identifier: "kathmandudc",
  case_type: "Cooperative Fraud",
  case_status: "Ongoing",
  plaintiff: "Nepal Government",
  defendant: "Rabi Lamichhane",
} as unknown as CourtCase;

// CourtCaseDetails is lazy() here so Radix Collapsible stays out of the initial
// payload (see the note in court-cases-section.tsx). Its own tests import the
// component directly, so they would keep passing even if this Suspense boundary
// never resolved — this is the test that would catch that.
describe("CourtCasesSection", () => {
  it("resolves the lazily-loaded court-case details", async () => {
    const { container } = render(
      <MemoryRouter>
        <CourtCasesSection
          title="Court cases"
          courtCases={[
            {
              id: "https://jawafdehi.org/courtcase/kathmandudc/080-c4-2408",
              courtCase,
              isLoading: false,
            },
          ]}
        />
      </MemoryRouter>,
    );

    // The heading is eager; the details arrive only once the chunk lands.
    expect(screen.getByRole("heading", { level: 2, name: "Court cases" })).toBeTruthy();

    await waitFor(() => {
      expect(container.textContent).toContain("Nepal Government");
    });
    expect(container.textContent).toContain("Rabi Lamichhane");
    expect(container.textContent).toContain("080-C4-2408");
  });

  it("renders nothing when there are no court cases", () => {
    const { container } = render(
      <MemoryRouter>
        <CourtCasesSection title="Court cases" courtCases={[]} />
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });
});
