import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CourtCaseCard } from "@/components/CourtCaseCard";
import { CourtCaseDetails } from "@/components/courtcase/CourtCaseDetails";
import type { CourtCase } from "@/types/jds";

// Passthrough translations so assertions don't depend on i18n resources. The
// one exception is the interpolating branch: the "X and N others" party
// summaries are the only strings here whose VALUE an assertion cares about, so
// they get a stand-in rendering rather than a bare key.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { count?: number; name?: string; countLabel?: string }) => {
      if (typeof fallback === "string") return fallback;
      if (fallback && "name" in fallback) {
        return `${fallback.name} +${fallback.countLabel ?? fallback.count}`;
      }
      return key;
    },
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
    // The wash keys off the COURT TIER, not the status: this resolved Supreme
    // Court case keeps its green status pill but takes the supreme oxblood
    // wash, where it used to take a green one derived from that same status.
    expect(
      container.querySelector(
        "[class*='background-image:linear-gradient(to_bottom,hsl(var(--court-supreme)/0.36)']",
      ),
    ).toBeTruthy();
    expect(
      container.querySelector("[class*='hsl(var(--success-strong)/0.09)']"),
    ).toBeNull();
    expect(
      container.querySelector('a[href="/courtcase/supreme/079-wo-0811"]'),
    ).toBeTruthy();
  });

  // One wash per tier, and the tier is what selects it. `status` is held
  // constant across all four, so a regression that reinstated status-driven
  // colouring would collapse them onto one class and fail here.
  it.each([
    ["district", "kathmandudc", "--court-district)/0.18"],
    ["high", "patanhc", "--court-high)/0.28"],
    ["special", "special", "--court-special)/0.30"],
    ["supreme", "supreme", "--court-supreme)/0.36"],
  ])("washes a %s court case with its own tier colour", (courtType, court, token) => {
    const { container } = render(
      <MemoryRouter>
        <CourtCaseCard
          court={court}
          courtType={courtType}
          status="फैसला भएको"
          title="मुद्दा"
          url={`/courtcase/${court}/1`}
        />
      </MemoryRouter>,
    );

    expect(
      container.querySelector(
        `[class*='background-image:linear-gradient(to_bottom,hsl(var(${token})']`,
      ),
    ).toBeTruthy();
  });

  // The alpha rises with tier on purpose — a flat alpha makes the four
  // indistinguishable. Pin the ordering so a "tidy up the magic numbers"
  // refactor cannot quietly flatten it.
  it("deepens the wash as the tier rises", () => {
    const alphas = ["kathmandudc", "patanhc", "special", "supreme"].map((court) => {
      const { container } = render(
        <MemoryRouter>
          <CourtCaseCard court={court} title="मुद्दा" url={`/courtcase/${court}/1`} />
        </MemoryRouter>,
      );
      const cls = container.querySelector("a")?.className ?? "";
      return Number(/\/(0\.\d+)\)/.exec(cls)?.[1]);
    });

    expect(alphas).toEqual([...alphas].sort((a, b) => a - b));
    expect(new Set(alphas).size).toBe(4);
  });

  // `court_type` is absent on documents indexed before the field existed, so
  // the tier has to survive being derived from the identifier alone.
  it("falls back to the court identifier when the API sends no court_type", () => {
    const { container } = render(
      <MemoryRouter>
        <CourtCaseCard court="butwalhc" title="मुद्दा" url="/courtcase/butwalhc/1" />
      </MemoryRouter>,
    );

    expect(
      container.querySelector(
        "[class*='background-image:linear-gradient(to_bottom,hsl(var(--court-high)/0.28)']",
      ),
    ).toBeTruthy();
  });

  it("applies no wash when the tier cannot be established", () => {
    const { container } = render(
      <MemoryRouter>
        <CourtCaseCard court="appellate" title="मुद्दा" url="/courtcase/appellate/1" />
      </MemoryRouter>,
    );

    expect(
      container.querySelector("[class*='background-image:linear-gradient']"),
    ).toBeNull();
  });
});

describe("CourtCaseCard parties", () => {
  const partyProps = {
    caseNumber: "083-C1-0163",
    court: "chitwandc",
    courtType: "district",
    registrationDate: "2026-08-31",
    title: "District Court Chitwan 083-C1-0163",
    url: "/courtcase/chitwandc/083-c1-0163",
  };

  function renderCard(props: Partial<React.ComponentProps<typeof CourtCaseCard>> = {}) {
    const { container } = render(
      <MemoryRouter>
        <CourtCaseCard {...partyProps} {...props} />
      </MemoryRouter>,
    );
    return container;
  }

  it("names each side's first party and counts the rest", () => {
    const container = renderCard({
      defendant: { names: ["राम बहादुर", "श्याम", "हरि"], total: 3 },
      plaintiff: { names: ["नेपाल सरकार"], total: 1 },
    });

    expect(container.textContent).toContain("Defendant:");
    expect(container.textContent).toContain("राम बहादुर +2");
    expect(container.textContent).toContain("Plaintiff:");
    // A lone party gets no count appended at all.
    expect(container.textContent).toContain("नेपाल सरकार");
    expect(container.textContent).not.toContain("नेपाल सरकार +");
  });

  it("counts from the uncapped total rather than the capped name list", () => {
    // The indexer stores at most PARTY_NAME_CAP (5) names but the true count in
    // `total`; counting the array would under-report every large case and stop
    // being true at the cap.
    const container = renderCard({
      defendant: { names: ["A", "B", "C", "D", "E"], total: 12 },
    });

    expect(container.textContent).toContain("A +11");
  });

  it("shows the defendant before the plaintiff", () => {
    // Deliberately the reverse of the detail page's legal citation order: on a
    // results grid the defendant is what tells two cards apart, while the
    // plaintiff is very often the same government body on all of them.
    const container = renderCard({
      defendant: { names: ["Defendant Name"], total: 1 },
      plaintiff: { names: ["Plaintiff Name"], total: 1 },
    });

    const text = container.textContent ?? "";
    expect(text).toContain("Defendant:");
    expect(text.indexOf("Defendant:")).toBeLessThan(text.indexOf("Plaintiff:"));
  });

  it("renders no party rows for a document indexed before parties existed", () => {
    // `extra.parties` is absent until the index is rebuilt, so this is the
    // common case in production today. It has to look exactly like the card did
    // before, not like a case with no parties on record.
    const container = renderCard();

    expect(container.textContent).not.toContain("Defendant");
    expect(container.textContent).not.toContain("Plaintiff");
    // The fields that were always there are untouched.
    expect(screen.getByText("083-C1-0163")).toBeTruthy();
    expect(screen.getByText("Chitwan District Court")).toBeTruthy();
  });

  it("drops only the side that has no names", () => {
    // The API writes both sides together, but a side it could not attribute
    // comes back empty rather than guessed at — a wrong party on a court record
    // is worse than a missing one.
    const container = renderCard({
      defendant: { names: ["Sole Defendant"], total: 1 },
      plaintiff: { names: [], total: 0 },
    });

    expect(container.textContent).toContain("Defendant:");
    expect(container.textContent).not.toContain("Plaintiff:");
  });
});
