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
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: "en" },
  }),
}));

const getCaseById = vi.fn();
const getCaseByCourtRef = vi.fn();
vi.mock("@/services/jds-api", () => ({
  getCaseById: (...args: unknown[]) => getCaseById(...args),
  getCaseByCourtRef: (...args: unknown[]) => getCaseByCourtRef(...args),
}));

vi.mock("@/services/api", () => ({ getEntityById: vi.fn() }));
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
  case_start_date: null,
  case_end_date: null,
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
