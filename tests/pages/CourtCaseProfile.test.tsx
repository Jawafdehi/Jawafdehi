import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

import CourtCaseProfile from "@/pages/CourtCaseProfile";
import type { CourtCase } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: "en" },
  }),
}));

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

    // Title: case type
    expect(await screen.findByRole("heading", { level: 1, name: "सहकारी ठगी" })).toBeTruthy();

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
    expect(screen.getByText("VS")).toBeTruthy();
    expect(screen.getByText("नारद अवस्थी")).toBeTruthy();
    expect(screen.getByText("कुन्ता भाट")).toBeTruthy();

    // Case Activity section
    const activityPill = screen.getByText(/BAIL ORDER|ORDER/);
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

  it("renders not-found alert when the API returns error", async () => {
    vi.mocked(getCourtCaseFull).mockRejectedValueOnce(new Error("Not found"));

    renderPage();

    expect(
      await screen.findByText(
        "This court case could not be found in the Jawafdehi governance archive.",
      ),
    ).toBeTruthy();
  });
});
