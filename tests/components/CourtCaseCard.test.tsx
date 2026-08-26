import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CourtCaseCard, CourtCaseDetails } from "@/components/CourtCaseCard";
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
// page passes to CourtCaseDetails. It carries plaintiff/defendant STRINGS but has
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

describe("CourtCaseDetails", () => {
  it("renders the core (no entities/hearings) shape without crashing", () => {
    render(
      <MemoryRouter>
        <CourtCaseDetails courtCaseId="https://jawafdehi.org/courtcase/kathmandudc/080-c4-2408" courtCase={coreCase} isLoading={false} />
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
        <CourtCaseDetails courtCaseId="https://jawafdehi.org/courtcase/kathmandudc/080-c4-2408" courtCase={fullCase} isLoading={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("CIAA")).toBeTruthy();
    expect(screen.getByText("Gitendra Babu Rai")).toBeTruthy();
    expect(screen.getByText(/Hearings/)).toBeTruthy();
  });

  it("parses @id IRI refs: court name, uppercased number, detail link", () => {
    const { container } = render(
      <MemoryRouter>
        <CourtCaseDetails
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

  it("keeps the court/number identifier as the heading, not a party cause title", () => {
    // Even when both parties are known, the heading stays the case-number/court
    // identifier — the parties render only in the Plaintiff/Defendant row below.
    const registryCase = {
      ...coreCase,
      plaintiff: "नेपाल सरकार",
      defendant: "प्रतिवादी समेत २",
    } as CourtCase;

    render(
      <MemoryRouter>
        <CourtCaseDetails
          courtCaseId="https://jawafdehi.org/courtcase/special/082-cr-0154"
          courtCase={registryCase}
          isLoading={false}
        />
      </MemoryRouter>,
    );

    // Heading is the canonical court/number reference…
    expect(screen.getByText("082-CR-0154 (Special Court)")).toBeTruthy();
    // …never a "<plaintiff> v. <defendant>" cause title.
    expect(screen.queryByText(/नेपाल सरकार v\./)).toBeNull();
    // Parties still surface in the dedicated Plaintiff/Defendant row.
    expect(screen.getByText("नेपाल सरकार")).toBeTruthy();
    expect(screen.getByText("प्रतिवादी समेत २")).toBeTruthy();
  });
});

describe("CourtCaseCard", () => {
  it("renders the reusable court-case summary and uses the shared resolved status badge", () => {
    const { container } = render(
      <MemoryRouter>
        <CourtCaseCard
          caseNumber="079-WO-0811"
          court="supreme"
          registrationDate="2022-07-24"
          status="फैसला भएको"
          title="नेपाली सेनामा अवकाश उमेरको विवाद"
          url="/courtcase/supreme/079-wo-0811"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "नेपाली सेनामा अवकाश उमेरको विवाद" })
        .className,
    ).toContain("sm:text-xl");
    expect(
      screen.getByRole("heading", { name: "नेपाली सेनामा अवकाश उमेरको विवाद" })
        .className,
    ).toContain("sm:leading-7");
    expect(screen.getByText("079-WO-0811")).toBeTruthy();
    expect(screen.getByText("079-WO-0811").className).not.toContain("truncate");
    expect(screen.getByText("Supreme Court").className).not.toContain("truncate");
    expect(screen.getByText("Registered: 2022-07-24").className).not.toContain(
      "truncate",
    );
    expect(screen.getByText("फैसला भएको").className).toContain("truncate");
    expect(container.querySelector(".bg-success-strong.text-white")).toBeTruthy();
    expect(
      container.querySelector(
        "[class*='background-image:linear-gradient(to_bottom,hsl(var(--success-strong)']",
      ),
    ).toBeTruthy();
    expect(
      container.querySelector('a[href="/courtcase/supreme/079-wo-0811"]'),
    ).toBeTruthy();
  });
});
