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

// Kept as a spy specifically so the fan-out regression test below can assert it
// is never called. The page no longer imports it; if it ever does again, that
// test fails rather than the page quietly reopening 255 connections per view.
const getEntityById = vi.fn();
vi.mock("@/services/api", () => ({ getEntityById: (...args: unknown[]) => getEntityById(...args) }));
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
  getEntityById.mockReset();
});

describe("CaseDetail party identity (no per-entity fan-out)", () => {
  // The widest published case binds 255 parties. Each used to be its own
  // `GET /api/entities/<iri>`, and the API opens a Postgres connection per
  // request against a ceiling of 100 — that is what exhausted it and served
  // intermittent 500s for nine days (COE 2026-09-29). The detail payload now
  // carries `name`/`image`, so the page must not issue any of those requests.
  const withParties = (count: number): CaseDetailType => ({
    ...makeCase("wide-case"),
    entities: Array.from({ length: count }, (_, i) => ({
      nes_id: `https://jawafdehi.org/entity/person/party-${i}`,
      display_name: `Party ${i}`,
      entity_type: "Person",
      type: "accused",
      outcome: null,
      notes: "",
      name: { en: `Party ${i}`, ne: `पक्ष ${i}` },
      image: null,
    })),
  });

  it("issues no entity requests, however many parties the case binds", async () => {
    getCaseById.mockResolvedValue(withParties(255));

    renderAt("wide-case");

    await waitFor(() => expect(getCaseById).toHaveBeenCalled());
    expect(getEntityById).not.toHaveBeenCalled();
  });

  it("still issues none when the payload omits the identity fields", async () => {
    // A case object with no `name`/`image` — the list payload's shape, and what
    // a stale cache would hold. The page must degrade to `display_name` rather
    // than fall back to fetching, which would restore the fan-out exactly where
    // the data is thinnest.
    const noIdentity = withParties(40);
    noIdentity.entities = noIdentity.entities.map(
      ({ name: _name, image: _image, ...bind }) => bind,
    );
    getCaseById.mockResolvedValue(noIdentity);

    renderAt("wide-case");

    await waitFor(() => expect(getCaseById).toHaveBeenCalled());
    expect(getEntityById).not.toHaveBeenCalled();
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
