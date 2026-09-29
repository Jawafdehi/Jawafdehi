import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CaseDetail as CaseDetailType } from "@/types/jds";

// Spy on useNavigate while keeping the rest of react-router-dom real (MemoryRouter,
// useParams, Link, Navigate) so the route param drives `id` as it does in the app.
const navigateSpy = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateSpy };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // i18next's second argument is either a string fallback or an options bag
    // ({ count }, { defaultValue }). Returning it blindly hands React an object
    // to render, which throws — so only a string fallback is honoured.
    t: (key: string, fallback?: unknown) => (typeof fallback === "string" ? fallback : key),
    i18n: { language: "en" },
  }),
}));

const getCaseById = vi.fn();
const getCaseByCourtRef = vi.fn();
vi.mock("@/services/jds-api", () => ({
  getCaseById: (...args: unknown[]) => getCaseById(...args),
  getCaseByCourtRef: (...args: unknown[]) => getCaseByCourtRef(...args),
}));

// ENTITY_BATCH_SIZE must be a real value here, not a bare vi.fn() module: the
// page chunks its entity list with it, and an undefined stride silently
// collapses the chunking to a single empty batch that asserts nothing.
const getEntityRecordsBatch = vi.fn();
vi.mock("@/services/api", () => ({
  ENTITY_BATCH_SIZE: 25,
  getEntityRecordsBatch: (...args: unknown[]) => getEntityRecordsBatch(...args),
}));
vi.mock("@/services/datalake-api", () => ({ getCourtCase: vi.fn() }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

// Stub the heavy presentational children so the test isolates the redirect logic.
vi.mock("@/components/FloatingShareSidebar", () => ({ FloatingShareSidebar: () => null }));
vi.mock("@/components/ReportCaseDialog", () => ({ ReportCaseDialog: () => null }));
vi.mock("@/components/DisqusComments", () => ({ DisqusComments: () => null }));
vi.mock("@/components/case-detail/case-detail-banner", () => ({ CaseDetailBanner: () => null }));
vi.mock("@/components/case-detail/case-contact-strip", () => ({ CaseContactStrip: () => null }));
vi.mock("@/components/case-detail/case-disclaimer-banner", () => ({ CaseDisclaimerBanner: () => null }));
vi.mock("@/components/case-detail/case-overview-section", () => ({ CaseOverviewSection: () => null }));
vi.mock("@/components/case-detail/case-section-jump-nav", () => ({ CaseSectionJumpNav: () => null }));
vi.mock("@/components/case-detail/missing-details-section", () => ({ MissingDetailsSection: () => null }));
vi.mock("@/components/case-detail/notes-section", () => ({ NotesSection: () => null }));
vi.mock("@/components/case-detail/case-timeline-section", () => ({ CaseTimelineSection: () => null }));
vi.mock("@/components/case-detail/mobile-share-expander", () => ({ MobileShareExpander: () => null }));
vi.mock("@/components/case-detail/court-cases-section", () => ({ CourtCasesSection: () => null }));
vi.mock("@/components/case-detail/evidence-section", () => ({ EvidenceSection: () => null }));
vi.mock("@/components/case-detail/involved-parties-section", () => ({ InvolvedPartiesSection: () => null }));
vi.mock("@/components/case-detail/key-allegations-section", () => ({ KeyAllegationsSection: () => null }));

import CaseDetail from "@/pages/CaseDetail";

const makeCase = (slug: string | null): CaseDetailType => ({
  id: 42,
  slug,
  case_type: "CORRUPTION",
  state: "PUBLISHED",
  title: "Test case",
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
});

const renderAt = (routeSlug: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/case/${routeSlug}`]}>
          <Routes>
            <Route path="/case/:id" element={<CaseDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

beforeEach(() => {
  navigateSpy.mockReset();
  getCaseById.mockReset();
  getCaseByCourtRef.mockReset();
  getEntityRecordsBatch.mockReset();
  getEntityRecordsBatch.mockResolvedValue({});
});

const makeEntities = (count: number): CaseDetailType["entities"] =>
  Array.from({ length: count }, (_, i) => ({
    nes_id: `https://jawafdehi.org/entity/person/party-${i}`,
    display_name: `Party ${i}`,
    entity_type: "Person",
    type: "accused",
    outcome: null,
    notes: "",
  })) as CaseDetailType["entities"];

describe("CaseDetail entity resolution is batched", () => {
  // A case page used to fetch one /api/entities record per party, in parallel,
  // on mount. The median case cites 5 parties so it never showed; the worst
  // published case cites 255, against an API that sheds load past 64 concurrent
  // requests cluster-wide. These lock in the batch form.
  it("chunks the party list into ENTITY_BATCH_SIZE requests instead of one per party", async () => {
    getCaseById.mockResolvedValue({ ...makeCase("current-slug"), entities: makeEntities(60) });

    renderAt("current-slug");

    await waitFor(() => expect(getEntityRecordsBatch).toHaveBeenCalledTimes(3));
    const chunks = getEntityRecordsBatch.mock.calls.map(([chunk]) => chunk as string[]);
    expect(chunks.map((c) => c.length)).toEqual([25, 25, 10]);
    // Every party is still resolved — batching must not drop the tail.
    expect(chunks.flat()).toHaveLength(60);
    expect(new Set(chunks.flat()).size).toBe(60);
  });

  it("deduplicates parties bound to the same entity more than once", async () => {
    const entities = makeEntities(2);
    getCaseById.mockResolvedValue({
      ...makeCase("current-slug"),
      entities: [...entities, ...entities],
    });

    renderAt("current-slug");

    await waitFor(() => expect(getEntityRecordsBatch).toHaveBeenCalledTimes(1));
    expect(getEntityRecordsBatch.mock.calls[0][0]).toHaveLength(2);
  });

  it("issues no entity request for a case with no parties", async () => {
    getCaseById.mockResolvedValue(makeCase("current-slug"));

    renderAt("current-slug");

    await waitFor(() => expect(getCaseById).toHaveBeenCalled());
    expect(getEntityRecordsBatch).not.toHaveBeenCalled();
  });
});

describe("CaseDetail canonical slug redirect (BB-38)", () => {
  it("replaces the URL with the canonical slug when the route slug is stale", async () => {
    // The API 301-redirects the old slug and fetch follows it, so the case that
    // comes back carries the canonical slug — here, different from the route.
    getCaseById.mockResolvedValue(makeCase("current-slug"));

    renderAt("old-slug");

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith("/case/current-slug", { replace: true }),
    );
    expect(getCaseById).toHaveBeenCalledWith("old-slug");
  });

  it("redirects a /case/<court-ref> URL to the canonical case slug", async () => {
    // Court-ref-style URLs (e.g. /case/081-CR-0116) resolve via getCaseByCourtRef;
    // the effect must replace the URL with the resolved case's canonical slug.
    // This covers the path the old court-ref-only <Navigate> block used to handle.
    getCaseByCourtRef.mockResolvedValue(makeCase("current-slug"));

    renderAt("081-CR-0116");

    await waitFor(() =>
      expect(navigateSpy).toHaveBeenCalledWith("/case/current-slug", { replace: true }),
    );
    expect(getCaseByCourtRef).toHaveBeenCalledWith("081-CR-0116");
    expect(getCaseById).not.toHaveBeenCalled();
  });

  it("does not redirect (no loop) when the route slug is already canonical", async () => {
    getCaseById.mockResolvedValue(makeCase("current-slug"));

    renderAt("current-slug");

    // Give the query time to resolve and any effect to run.
    await waitFor(() => expect(getCaseById).toHaveBeenCalledWith("current-slug"));
    await Promise.resolve();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("does not redirect when the loaded case has no canonical slug", async () => {
    getCaseById.mockResolvedValue(makeCase(null));

    renderAt("42");

    await waitFor(() => expect(getCaseById).toHaveBeenCalledWith("42"));
    await Promise.resolve();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});

describe("CaseDetail stage dates (banner and sidebar in step)", () => {
  const withStages = (slug: string): CaseDetailType => ({
    ...makeCase(slug),
    dates: {
      stages: [
        { stage: "initial", start: "2021-10-02", end: "2023-06-09" },
        { stage: "appeal", start: "2023-07-11", notes: "मिसिल जलेको" },
      ],
    },
  });

  it("renders the same labelled stage rows in the sidebar as the banner does", async () => {
    // The banner is stubbed out in this suite, so every row found here comes
    // from the page's own metadata block — the two used to carry separate
    // copies of the date range and could drift.
    getCaseById.mockResolvedValue(withStages("stage-case"));

    const { container } = renderAt("stage-case");

    await waitFor(() =>
      expect(
        container.querySelectorAll('[data-testid="case-stage-row"]').length,
      ).toBe(2),
    );
    const rows = container.querySelectorAll('[data-testid="case-stage-row"]');
    expect(rows[0].getAttribute("data-stage")).toBe("initial");
    expect(rows[1].getAttribute("data-stage")).toBe("appeal");
    expect(rows[1].getAttribute("data-pending")).toBe("true");
  });

  it("drops the single 'Case date' label from the sidebar too", async () => {
    getCaseById.mockResolvedValue(withStages("stage-case"));

    const { container } = renderAt("stage-case");

    await waitFor(() =>
      expect(container.textContent).toContain("caseDetail.stages.initial"),
    );
    expect(container.textContent).not.toContain("caseDetail.period");
  });

  it("explains a pending stage in the sidebar with its public note", async () => {
    getCaseById.mockResolvedValue(withStages("stage-case"));

    const { container } = renderAt("stage-case");

    await waitFor(() =>
      expect(container.textContent).toContain("मिसिल जलेको"),
    );
  });
});
