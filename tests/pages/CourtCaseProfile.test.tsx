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

    // Status badge: the register writes this state as both चालु and चलिरहेको,
    // so the pill shows one normalized word for either.
    expect(screen.getByText("Ongoing")).toBeTruthy();
    expect(screen.queryByText("चालु")).toBeNull();

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

// The errors found on 3 Nov 2026 (work/2026-11-03-case-pages): each page below
// is the live API record of a real case, reduced to the rows that matter.
describe("CourtCaseProfile — labels come from the court's own record", () => {
  const supremeHearing = (id: number, date_bs: string, date_ad: string, extra = {}) => ({
    id,
    case_number: "083-WH-0084",
    court_identifier: "supreme",
    hearing_date_bs: date_bs,
    hearing_date_ad: date_ad,
    bench: null,
    bench_type: "संयुक्त इजलास",
    judge_names: null,
    lawyer_names: null,
    serial_no: "8",
    case_status: null as unknown as string,
    decision_type: null as unknown as string,
    remarks: "वन्दीप्रत्येक्षीकरण",
    ...extra,
  });

  const supremeCase = (over: Partial<CourtCase>): CourtCase => ({
    ...mockCourtCase,
    case_number: "083-WH-0084",
    court_identifier: "supreme",
    case_type: "बन्दीप्रत्यक्षीकरण",
    case_status: null,
    verdict_date_bs: null,
    verdict_date_ad: null,
    verdict_type: null,
    entities: [],
    ...over,
  });

  it("a cause-list listing reads 'Listed for hearing', never 'Order' (083-WH-0084)", async () => {
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(
      supremeCase({
        hearings: [
          supremeHearing(10682795, "2083-07-13", "2026-10-30"),
          supremeHearing(5880068, "2083-06-08", "2026-09-24", { serial_no: "4" }),
        ],
      }),
    );
    renderPage("/courtcase/supreme/083-WH-0084");

    expect(await screen.findAllByText("Listed for hearing")).toHaveLength(2);
    // A listing is neutral grey, not the crimson accent used for court actions.
    for (const pill of screen.getAllByText("Listed for hearing")) {
      expect(pill.dataset.tone).toBe("neutral");
      expect(pill.className).toContain("bg-muted");
      expect(pill.className).toContain("text-muted-foreground");
      expect(pill.className).not.toContain("text-accent");
    }
    expect(screen.queryByText("Order")).toBeNull();
    // No register status and no decision on record: no pill, rather than "Ongoing".
    expect(screen.queryByText("Ongoing")).toBeNull();
    expect(screen.queryByText("Decided")).toBeNull();
  });

  it("shows 'Not reached' where the court recorded हेर्न नभ्याइने", async () => {
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(
      supremeCase({
        hearings: [
          supremeHearing(1, "2083-07-13", "2026-10-30", {
            case_status: "हेर्न नभ्याइने",
            judge_names: "मा.न्या. श्री शारङ्गा सुवेदी, मा.न्या. श्री शान्तिसिंह थापा",
          }),
        ],
      }),
    );
    renderPage("/courtcase/supreme/083-WH-0084");
    expect(await screen.findByText("Not reached")).toBeTruthy();
    expect(screen.getByText("Not reached").dataset.tone).toBe("accent");
    expect(screen.queryByText("Order")).toBeNull();
  });

  it("a decided case with no register status shows Decided and the decision (083-WH-0093)", async () => {
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(
      supremeCase({
        case_number: "083-WH-0093",
        verdict_date_bs: "2083-06-23",
        verdict_date_ad: "2026-10-09",
        verdict_type: "CLAIM_DENIED",
        hearings: [
          supremeHearing(3, "2083-06-23", "2026-10-09", {
            case_status: "फैसला",
            decision_type: "रिट खारेज फाइल हेर्नुहोस्",
          }),
          supremeHearing(2, "2083-06-22", "2026-10-08"),
          supremeHearing(1, "2083-06-19", "2026-10-05", {
            case_status: "आदेश",
            decision_type: "कारण देखाउ आदेश",
          }),
        ],
      }),
    );
    renderPage("/courtcase/supreme/083-WH-0093");

    expect(await screen.findByText("Decided")).toBeTruthy();
    const decisionRow = screen.getByText("Decision", { selector: "span" }).closest("div")?.parentElement;
    expect(decisionRow?.textContent).toContain("रिट खारेज");
    expect(decisionRow?.textContent).not.toContain("फाइल हेर्नुहोस्");
    // 06-22 was only a listing; 06-19 was an order; 06-23 the decision.
    expect(screen.getByText("Listed for hearing")).toBeTruthy();
    // "Order": the 06-19 badge, and the caption over the 06-19 and 06-23 order text.
    expect(screen.getAllByText("Order")).toHaveLength(3);
    expect(screen.getAllByText("Decision", { selector: "span" })).toHaveLength(1);
  });

  it("a custody order is not labelled bail (082-CR-0154, 2083-03-03)", async () => {
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce({
      ...mockCourtCase,
      court_identifier: "special",
      case_number: "082-CR-0154",
      case_status: "चलिरहेको",
      hearings: [
        {
          ...mockCourtCase.hearings![0],
          court_identifier: "special",
          hearing_date_bs: "2083-03-03",
          hearing_date_ad: "2026-06-17",
          case_status: "आदेश",
          decision_type: "थुनछेक आदेश (थुनामा राख्ने)",
          remarks: "थुनछेक",
        },
      ],
    });
    renderPage("/courtcase/special/082-CR-0154");

    expect(await screen.findByText("Custody hearing: held in custody")).toBeTruthy();
    expect(screen.queryByText("Bail order")).toBeNull();
  });

  it("captions an adjournment's reason as Details, not Order", async () => {
    vi.mocked(getCourtCaseFull).mockResolvedValueOnce(
      supremeCase({
        hearings: [
          supremeHearing(1, "2083-06-12", "2026-09-28", {
            case_status: "स्थगीत",
            decision_type: "निवेदकको कानून व्यवसायीबाट",
          }),
        ],
      }),
    );
    renderPage("/courtcase/supreme/083-WH-0061");
    expect(await screen.findByText("Adjourned")).toBeTruthy();
    expect(screen.getByText("Details")).toBeTruthy();
    expect(screen.queryByText("Order")).toBeNull();
  });
});
