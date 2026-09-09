import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

import CourtCaseProfile from "@/pages/CourtCaseProfile";
import type { CourtCase } from "@/types/jds";

// The active language is mutable so the Nepali-first rendering can be asserted
// as well as the English. `vi.hoisted` because a vi.mock factory is lifted
// above the module body, so it cannot close over a plain `let` declared here.
const i18nState = vi.hoisted(() => ({ language: "en" }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === "string" ? fallback : fallback?.defaultValue ?? key,
    i18n: { language: i18nState.language },
  }),
}));

afterEach(() => {
  i18nState.language = "en";
});

// Mock the API client
vi.mock("@/services/datalake-api", () => ({
  getCourtCaseFull: vi.fn(),
}));

vi.mock("@/services/jds-api", () => ({
  getCasesCitingCourtCase: vi.fn().mockResolvedValue({ count: 0, results: [] }),
}));

import { getCourtCaseFull } from "@/services/datalake-api";

const mockCourtCase: CourtCase = {
  case_number: "083-C1-0087",
  court_identifier: "kanchanpurdc",
  registration_date_bs: "2083-05-09",
  registration_date_ad: "2026-08-25",
  case_type: "सहकारी ठगी",
  division: null,
  category: null,
  section: null,
  plaintiff: "नारद अवस्थी को जाहेरीले नेपाल सरकार",
  defendant: "कुन्ता भाट",
  original_case_number: "083-C1-0087",
  case_id: null,
  priority: null,
  registration_number: "",
  case_status: "चालु",
  verdict_date_bs: null,
  verdict_date_ad: null,
  verdict_judge: null,
  status: "ongoing",
  material_id: "https://jawafdehi.org/material/court/kanchanpurdc.083-c1-0087",
  entities: [
    {
      id: 1,
      case_number: "083-C1-0087",
      court_identifier: "kanchanpurdc",
      side: "plaintiff",
      name: "नारद अवस्थी",
      address: null,
      nes_id: null,
    },
    {
      id: 2,
      case_number: "083-C1-0087",
      court_identifier: "kanchanpurdc",
      side: "defendant",
      name: "कुन्ता भाट",
      address: null,
      nes_id: null,
    },
  ],
  hearings: [
    {
      id: 101,
      case_number: "083-C1-0087",
      court_identifier: "kanchanpurdc",
      hearing_date_bs: "2083-05-09",
      hearing_date_ad: "2026-08-25",
      bench: "इजलाश 1",
      bench_type: "",
      judge_names: "माननीय जिल्ला न्यायाधीश श्री महेन्द्रबहादुर थापा क्षेत्री",
      lawyer_names: null,
      serial_no: "क",
      case_status: "आदेश",
      decision_type: "आदेश >> धरौटी माग गर्ने",
      remarks: "",
    },
  ],
};

function renderPage(initialRoute = "/courtcase/kanchanpurdc/083-c1-0087") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/courtcase/*" element={<CourtCaseProfile />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("CourtCaseProfile (redesigned layout)", () => {
  it("renders the case title, status badge, metadata, parties, activity, and source", async () => {
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(mockCourtCase);

    renderPage();

    // Back to search link
    expect(screen.getByText("Back to search")).toBeTruthy();

    // The record title sits above compact, inline metadata rows.
    expect(await screen.findByRole("heading", { level: 1, name: "सहकारी ठगी" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).closest("section")?.id).toBe("case-summary");
    expect(screen.getByRole("heading", { level: 2, name: "Case summary" })).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "Jump to case section" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Case summary" })).toHaveLength(2);

    // Status badge: existing status pill
    expect(screen.getByText("चालु")).toBeTruthy();

    // Metadata list
    expect(screen.getByText("Case number")).toBeTruthy();
    expect(screen.getByText("083-C1-0087")).toBeTruthy();

    expect(screen.getByText("Court")).toBeTruthy();
    expect(screen.getByText("Kanchanpur District Court")).toBeTruthy();

    expect(screen.getByText("Registered")).toBeTruthy();
    expect(screen.getAllByText(/Aug 25, 2026/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/२०८३ भाद्र ९/).length).toBeGreaterThanOrEqual(1);

    // Parties section
    expect(screen.getByRole("heading", { level: 2, name: /Parties/i })).toBeTruthy();
    expect(screen.getByText("Plaintiff")).toBeTruthy();
    expect(screen.getByText("Defendant")).toBeTruthy();
    expect(screen.queryByText("VS")).toBeNull();
    expect(screen.getByText("नारद अवस्थी")).toBeTruthy();
    expect(screen.getByText("कुन्ता भाट")).toBeTruthy();
    expect(screen.getByText("कुन्ता भाट").closest("ul")?.className).toContain("font-medium");
    expect(screen.getByText("Back to search").closest(".layout-container")?.className).not.toContain("max-w-4xl");

    // Case Activity section
    const activityPill = screen.getByText("Bail order");
    expect(activityPill).toBeTruthy();
    expect(activityPill.className).toContain("text-accent");
    expect(activityPill.className).toContain("bg-accent/10");
    expect(screen.getByText("Judge")).toBeTruthy();
    expect(screen.getByText("माननीय जिल्ला न्यायाधीश श्री महेन्द्रबहादुर थापा क्षेत्री")).toBeTruthy();
    expect(screen.getByText("Order")).toBeTruthy();
    expect(screen.getByText("आदेश >> धरौटी माग गर्ने")).toBeTruthy();

    // Source section
    expect(screen.getByRole("heading", { level: 2, name: /Source/i })).toBeTruthy();
    expect(screen.getByText("Jawafdehi Governance Archive")).toBeTruthy();
    expect(screen.getByText("View source")).toBeTruthy();
  });

  // Both halves of the Copilot review comment on PR #352: the court name was
  // formatted with `formatCourtName`'s default "en", and the date came from
  // `formatDateWithBS`, which always emits "AD | BS" in that order — so a
  // Nepali reader got an English court name and a Gregorian-first date.
  it("localises the court name and leads with the BS date in Nepali", async () => {
    i18nState.language = "ne";
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(mockCourtCase);

    renderPage();

    expect(await screen.findByText("Kanchanpur जिल्ला अदालत")).toBeTruthy();
    expect(screen.queryByText("Kanchanpur District Court")).toBeNull();

    // BS primary, AD parenthesised after it — not the old fixed "AD | BS".
    const registeredRow = screen.getByText("Registered").closest("div")?.parentElement;
    expect(registeredRow?.textContent).toContain("२०८३ भाद्र ९ (Aug 25, 2026)");
  });

  it("keeps the BS date first in English too", async () => {
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(mockCourtCase);

    renderPage();

    expect(await screen.findByText("Kanchanpur District Court")).toBeTruthy();
    const registeredRow = screen.getByText("Registered").closest("div")?.parentElement;
    expect(registeredRow?.textContent).toContain("२०८३ भाद्र ९ (Aug 25, 2026)");
  });

  it("renders not-found alert when the API returns error", async () => {
    vi.mocked(getCourtCaseFull).mockRejectedValueOnce(new Error("Not found"));

    renderPage();

    expect(
      await screen.findByText(
        "This court case could not be found in the Jawafdehi governance archive.",
      ),
    ).toBeTruthy();
  });

  it("reveals long party lists only when requested", async () => {
    const manyDefendants = {
      ...mockCourtCase,
      entities: [
        mockCourtCase.entities![0],
        ...["प्रतिवादी १", "प्रतिवादी २", "प्रतिवादी ३", "प्रतिवादी ४", "प्रतिवादी ५", "प्रतिवादी ६"].map((name, index) => ({
          id: index + 10,
          case_number: mockCourtCase.case_number,
          court_identifier: mockCourtCase.court_identifier,
          side: "defendant",
          name,
          address: null,
          nes_id: null,
        })),
      ],
    };
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(manyDefendants);

    renderPage();

    expect(await screen.findByText("प्रतिवादी ३")).toBeTruthy();
    expect(screen.queryByText("प्रतिवादी ४")).toBeNull();
    expect(screen.getByText("प्रतिवादी १").closest("ul")?.textContent).toContain("प्रतिवादी १, प्रतिवादी २, प्रतिवादी ३");
    fireEvent.click(screen.getByRole("button", { name: "Show 3 more" }));
    expect(screen.getByText("प्रतिवादी ४")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.queryByText("प्रतिवादी ४")).toBeNull();
  });
});
