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
        <CourtCaseCard courtCaseId="https://jawafdehi.org/courtcase/kathmandudc/080-c4-2408" courtCase={coreCase} isLoading={false} />
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
        <CourtCaseCard courtCaseId="https://jawafdehi.org/courtcase/kathmandudc/080-c4-2408" courtCase={fullCase} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("CIAA")).toBeTruthy();
    expect(screen.getByText("Gitendra Babu Rai")).toBeTruthy();
    expect(screen.getByText(/Hearings/)).toBeTruthy();
  });

  it("parses @id IRI refs: court name, uppercased number, detail link", () => {
    const { container } = render(
      <MemoryRouter>
        <CourtCaseCard
          courtCaseId="https://jawafdehi.org/courtcase/special/080-cr-0111"
          courtCase={coreCase}
          isLoading={false}
          linkToDetail
        />
      </MemoryRouter>,
    );

    // The IRI carries the number lowercased; the card displays it uppercase
    // with the mapped court name, and links to the composite-key detail page.
    expect(screen.getAllByText(/080-CR-0111/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Special Court/).length).toBeGreaterThan(0);
    expect(
      container.querySelector('a[href="/courtcase/special/080-cr-0111"]'),
    ).toBeTruthy();
  });

  it("uses the party cause title as the heading, demoting the court/number id", () => {
    // Core shape (compact registry party strings, no entities) — the "…समेत N"
    // et-al form a Special Court criminal docket carries.
    const registryCase = {
      ...coreCase,
      case_number: "082-CR-0154",
      court_identifier: "special",
      plaintiff: "नेपाल सरकार",
      defendant: "प्रतिवादी समेत २",
    } as CourtCase;

    render(
      <MemoryRouter>
        <CourtCaseCard
          courtCaseId="https://jawafdehi.org/courtcase/special/082-cr-0154"
          courtCase={registryCase}
          isLoading={false}
        />
      </MemoryRouter>,
    );

    // Heading is the human-readable "<plaintiff> <versus> <defendant>" cause
    // title — never the raw "special:082-cr-0154" identifier.
    expect(screen.getByText("नेपाल सरकार v. प्रतिवादी समेत २")).toBeTruthy();
    // The canonical court/number reference is kept as a demoted sub-line.
    expect(screen.getByText("082-CR-0154 (Special Court)")).toBeTruthy();
    expect(screen.queryByText(/special:082-cr-0154/i)).toBeNull();
  });

  it("falls back to the court/number identifier when no parties are known", () => {
    const bare = { ...coreCase, plaintiff: null, defendant: null } as CourtCase;

    render(
      <MemoryRouter>
        <CourtCaseCard
          courtCaseId="https://jawafdehi.org/courtcase/special/080-cr-0111"
          courtCase={bare}
          isLoading={false}
        />
      </MemoryRouter>,
    );

    // No parties → the identifier is the heading itself (no duplicate sub-line).
    expect(screen.getByText("080-CR-0111 (Special Court)")).toBeTruthy();
  });
});
