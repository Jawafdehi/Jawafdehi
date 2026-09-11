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
  dates: { stages: [] },
  status: "ongoing",
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
  authors: [],
  case_publish_date: null,
  public_edit_history: [],
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
  it("keeps actions with the case record and all three contributors in the independent sidebar", () => {
    const authors = Array.from({ length: 3 }, (_, index) => ({
      display_name: `Contributor ${index + 1}`, slug: `contributor-${index}`,
      title: "Caseworker", photo_url: "", has_public_page: false,
    }));
    render(<MemoryRouter><CaseDetailBanner
      caseData={makeCase({ authors, case_publish_date: "2026-01-03" })}
      resolvedEntities={{}} actions={<button>Submit information</button>}
    /></MemoryRouter>);
    const main = screen.getByTestId("case-dossier-main");
    const sidebar = screen.getByTestId("case-dossier-sidebar");
    expect(main.contains(screen.getByRole("button", { name: "Submit information" }))).toBe(true);
    expect(sidebar.querySelectorAll('[data-testid="author-card"]')).toHaveLength(3);
    expect(main.querySelector('[data-testid="case-byline"]')).toBeNull();
    expect(screen.getByTestId("case-byline-published").compareDocumentPosition(screen.getByTestId("case-byline-authors"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("keeps the hero and metadata in the same centered page-width column", () => {
    renderBanner(makeCase());

    expect(screen.getByTestId("case-detail-hero").className).toContain("max-w-[1400px]");
    expect(screen.getByTestId("case-detail-metadata").className).toContain("max-w-[1400px]");
  });

  it("keeps the image standalone and places the title in the readable content block below", () => {
    const { container } = renderBanner(makeCase());
    const heroImage = screen.getByTestId("case-detail-hero-image");
    const title = screen.getByRole("heading", { name: "Test case title" });

    expect(heroImage.className).not.toContain("absolute");
    expect(heroImage.getAttribute("width")).toBe("1400");
    expect(container.querySelector("[class*='bg-gradient']")).toBeNull();
    expect(screen.getByTestId("case-detail-hero").compareDocumentPosition(title)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

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

describe("CaseDetailBanner breadcrumb defaults", () => {
  it("takes its default labels from i18n, not hardcoded English", () => {
    // CaseDetail — the only production caller — passes neither homeLabel nor
    // casesLabel, so these defaults ARE what renders. They used to be the
    // literals "jawafdehi.org" and "case", which a Nepali reader saw untranslated.
    renderBanner(makeCase());

    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });

    // The mock returns the key when no fallback is given, so a translated
    // default shows up as its key and a hardcoded string as itself.
    expect(nav.textContent).toContain("nav.home");
    expect(nav.textContent).toContain("nav.cases");
    expect(nav.textContent).not.toContain("jawafdehi.org");
  });

  it("still prefers labels the caller supplies", () => {
    render(
      <MemoryRouter>
        <CaseDetailBanner
          caseData={makeCase()}
          resolvedEntities={{}}
          homeLabel="Jawafdehi"
          casesLabel="Cases"
        />
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav.textContent).toContain("Jawafdehi");
    expect(nav.textContent).toContain("Cases");
    expect(nav.textContent).not.toContain("nav.cases");
  });
});

describe("CaseDetailBanner case stages", () => {
  const STAGES: CaseDetail["dates"] = {
    stages: [
      { stage: "investigation", start: "2021-03-01", end: "2021-09-14" },
      {
        stage: "initial",
        start: "2021-10-02",
        end: "2023-06-09",
        courtcase_iri: "https://jawafdehi.org/courtcase/special/080-cr-0044",
      },
      { stage: "appeal", start: "2023-07-11", notes: "बेन्च गठन भएको छैन" },
    ],
  };

  it("renders one labelled row per stage instead of one 'Case date' range", () => {
    // "मुद्दा मिति / Case date" read to the public as when the corruption
    // happened. These are court registration and verdict dates, and there are
    // as many of them as there are forums.
    renderBanner(makeCase({ dates: STAGES }));

    const rows = screen.getAllByTestId("case-stage-row");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getAttribute("data-stage"))).toEqual([
      "investigation",
      "initial",
      "appeal",
    ]);
  });

  it("drops the single 'Case date' label the stage rows replace", () => {
    const { container } = renderBanner(makeCase({ dates: STAGES }));

    expect(container.textContent).not.toContain("caseDetail.period");
  });

  it("shows a pending stage's note, so the reader learns why it has no end", () => {
    renderBanner(makeCase({ dates: STAGES }));

    expect(screen.getByTestId("case-stage-note").textContent).toContain(
      "बेन्च गठन भएको छैन",
    );
  });

  it("renders no date block at all for a case with no stages", () => {
    renderBanner(makeCase({ dates: { stages: [] } }));

    expect(screen.queryByTestId("case-stage-dates")).toBeNull();
    expect(screen.queryAllByTestId("case-stage-row")).toHaveLength(0);
  });
});

describe("CaseDetailBanner status chip", () => {
  it("reads the lifecycle off the API rather than deriving it from a date", () => {
    // The server derives `status` from the stages; the client cannot, and used
    // to guess "concluded" from the presence of an end date.
    renderBanner(makeCase({ state: "PUBLISHED", status: "concluded" }));

    expect(screen.getByText("caseDetail.status.concluded")).toBeTruthy();
  });

  it("keeps the reviewer-facing workflow chip for a draft", () => {
    renderBanner(makeCase({ state: "DRAFT", status: "concluded" }));

    expect(screen.getByText("caseDetail.status.underInvestigation")).toBeTruthy();
  });

  it("reads the renamed offence_type in preference to the deprecated case_type", () => {
    renderBanner(
      makeCase({ case_type: "CORRUPTION", offence_type: "MONEY_LAUNDERING" }),
    );

    expect(screen.getByText("cases.type.moneyLaundering")).toBeTruthy();
  });
});
