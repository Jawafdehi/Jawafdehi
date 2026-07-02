import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CourtCaseCard } from "@/components/CourtCaseCard";
import type { CourtCase } from "@/types/jds";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { count?: number }) =>
      typeof fallback === "string" ? fallback : key,
    i18n: { language: "en" },
  }),
}));

// The composite-key core endpoint (getCourtCase) — the shape the case-detail
// page passes to CourtCaseCard. It carries plaintiff/defendant STRINGS but has
// NO `entities` or `hearings` sub-resources. Iterating them unguarded is what
// crashed the whole case page with "entities is not iterable".
const coreCase = {
  case_number: "080-C4-2408",
  court_identifier: "kathmandudc",
  registration_date_bs: null,
  registration_date_ad: null,
  case_type: "Cooperative Fraud",
  division: null,
  category: null,
  section: null,
  plaintiff: "Nepal Government",
  defendant: "Rabi Lamichhane",
  original_case_number: "080-C4-2408",
  case_id: null,
  priority: null,
  registration_number: "",
  case_status: "Ongoing",
  verdict_date_bs: null,
  verdict_date_ad: null,
  verdict_judge: null,
  status: "",
} as CourtCase;

describe("CourtCaseCard", () => {
  it("renders the core (no entities/hearings) shape without crashing", () => {
    render(
      <MemoryRouter>
        <CourtCaseCard courtCaseId="kathmandudc:080-C4-2408" courtCase={coreCase} isLoading={false} />
      </MemoryRouter>,
    );

    // Falls back to the plaintiff/defendant string fields when `entities` is absent.
    expect(screen.getByText("Nepal Government")).toBeTruthy();
    expect(screen.getByText("Rabi Lamichhane")).toBeTruthy();
    // No hearings sub-resource on the core shape → no hearings collapsible.
    expect(screen.queryByText(/Hearings/)).toBeNull();
  });

  it("prefers party entities and renders hearings on the assembled full shape", () => {
    const fullCase = {
      ...coreCase,
      entities: [
        { name: "CIAA", side: "plaintiff" },
        { name: "Gitendra Babu Rai", side: "defendant" },
      ],
      hearings: [{ id: 1, hearing_date_ad: "2025-01-10", case_status: "Heard" }],
    } as unknown as CourtCase;

    render(
      <MemoryRouter>
        <CourtCaseCard courtCaseId="kathmandudc:080-C4-2408" courtCase={fullCase} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("CIAA")).toBeTruthy();
    expect(screen.getByText("Gitendra Babu Rai")).toBeTruthy();
    expect(screen.getByText(/Hearings/)).toBeTruthy();
  });
});
