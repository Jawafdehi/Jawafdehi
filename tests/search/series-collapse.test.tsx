import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n/config";
import ArchiveSearch from "@/pages/ArchiveSearch";
import { readParams } from "@/utils/archive-search-params";
import type { ArchiveSearchResponse, ArchiveSearchResult } from "@/types/search";

import "../support/resize-observer";

const { searchArchiveMock } = vi.hoisted(() => ({ searchArchiveMock: vi.fn() }));

vi.mock("@/services/search-api", () => ({ searchArchive: searchArchiveMock }));
vi.mock("@/services/jds-api", () => ({
  getCaseById: vi.fn(),
  getDocumentSources: () => Promise.resolve({ ready: true, sources: [] }),
}));

function caseResult(slug: string, title: string): ArchiveSearchResult {
  return {
    type: "case",
    id: `https://jawafdehi.org/case/${slug}`,
    source_app: "jawafdehi",
    title: { ne: null, en: title },
    snippet: { ne: null, en: "" },
    score: 1,
    url: `/case/${slug}`,
    api_url: `/api/cases/${slug}/`,
    matched_fields: [],
    extra: {},
    card: {
      slug,
      title,
      short_description: null,
      key_allegations: [],
      tags: [],
      case_type: "CORRUPTION",
      status: "ongoing",
      case_start_date: "2024-01-01",
      case_end_date: null,
      bigo: null,
      thumbnail_url: null,
      banner_url: null,
      timeline: [],
      entities: [],
    },
  };
}

const series: ArchiveSearchResult = {
  type: "series",
  id: "https://jawafdehi.org/series/ncell-tax-dispute",
  source_app: "jawafdehi",
  title: { ne: "एनसेल कर विवाद", en: "Ncell tax dispute" },
  snippet: {},
  score: 1,
  url: "/series/ncell-tax-dispute/",
  api_url: "/api/series/ncell-tax-dispute/",
  matched_fields: [],
  extra: {},
  card: {
    slug: "ncell-tax-dispute",
    title: { ne: "एनसेल कर विवाद", en: "Ncell tax dispute" },
    summary: { ne: null, en: null },
    totals: {
      member_count: 3,
      court_case_count: 3,
      court_count: 2,
      bigo_max: null,
      accused_count: 0,
      status_counts: { ongoing: 3 },
    },
    members: [],
    member_count: 3,
    matched_member_count: 3,
    latest_date: "2025-05-10",
    thumbnail: null,
    thumbnail_url: null,
  } as unknown as ArchiveSearchResult["card"],
};

function response(over: Partial<ArchiveSearchResponse>): ArchiveSearchResponse {
  return {
    query: "",
    lang: "both",
    sort: "newest",
    page: 1,
    page_size: 10,
    count: 0,
    counts: { case: 8 },
    facets: { entity_type: [], case_type: [], tags: [], status: [] },
    results: [],
    next_cursor: null,
    ...over,
  } as ArchiveSearchResponse;
}

function renderSearch(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route element={<ArchiveSearch />} path="/search" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  searchArchiveMock.mockReset();
});

describe("readParams: the /cases browse asks for the series collapse", () => {
  const read = (query: string, type: "case" | "all" | "series" | "entity") =>
    readParams(new URLSearchParams(query), type);

  it("on the Cases tab with no query text", () => {
    expect(read("type=case", "case").collapse_series).toBe(true);
  });

  it("never for a typed search, where member cases stay findable", () => {
    expect(read("type=case&q=ncell", "case").collapse_series).toBeUndefined();
  });

  it("never on another tab", () => {
    expect(read("", "all").collapse_series).toBeUndefined();
    expect(read("type=entity", "entity").collapse_series).toBeUndefined();
  });
});

describe("/cases with the collapse", () => {
  it("renders one series card among the case cards, and counts cases", async () => {
    searchArchiveMock.mockResolvedValue(
      response({
        count: 3,
        case_count: 5,
        collapse_series: true,
        results: [caseResult("a", "Case A"), series, caseResult("b", "Case B")],
      }),
    );
    renderSearch("/search?type=case");
    await screen.findByTestId("series-list-card");
    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "case", collapse_series: true }),
    );
    expect(screen.getAllByTestId("series-list-card")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Case A" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Case B" })).toBeTruthy();
    // The label counts the cases (case_count), not the cards.
    expect(document.body.textContent).toMatch(/5 results/);
    // A listing card is one grid cell, not a full-width search card.
    expect(screen.getByTestId("series-list-card").closest(".col-span-full")).toBeNull();
  });

  it("an API without the collapse returns plain cases, which render as before", async () => {
    searchArchiveMock.mockResolvedValue(
      response({ count: 2, results: [caseResult("a", "Case A"), caseResult("b", "Case B")] }),
    );
    renderSearch("/search?type=case");
    await screen.findByRole("link", { name: "Case A" });
    expect(screen.queryByTestId("series-list-card")).toBeNull();
    await waitFor(() => expect(document.body.textContent).toMatch(/2 results/));
  });
});
