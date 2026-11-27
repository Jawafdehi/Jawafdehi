import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import i18n from "@/i18n/config";
import { FeaturedCaseGrid } from "@/components/home/featured-case-grid";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { SeriesListCard } from "@/components/series/SeriesListCard";
import { seriesHeadlineBigo, seriesListingCardOf } from "@/lib/case-series";
import type { ArchiveSearchResult } from "@/types/search";
import type { SeriesListingCard } from "@/types/series";

/** A collapsed-listing series item, as `GET /api/search/?collapse_series=1` sends it. */
function seriesListingResult(card: Partial<SeriesListingCard> = {}): ArchiveSearchResult {
  return {
    type: "series",
    id: "https://jawafdehi.org/series/ncell-tax-dispute",
    source_app: "jawafdehi",
    title: { ne: "एनसेल कर विवाद", en: "Ncell tax dispute" },
    snippet: {},
    score: 1,
    url: "/series/ncell-tax-dispute/",
    api_url: "/api/series/ncell-tax-dispute/",
    matched_fields: [],
    extra: { date: "2025-05-10" },
    card: {
      slug: "ncell-tax-dispute",
      title: { ne: "एनसेल कर विवाद", en: "Ncell tax dispute" },
      summary: { ne: "एनसेल बिक्रीको पुँजीगत लाभ कर।", en: null },
      totals: {
        member_count: 3,
        court_case_count: 3,
        court_count: 2,
        bigo_max: { amount: 39_060_000_000, member_slug: "ncell-1" },
        accused_count: 2,
        status_counts: { ongoing: 2, concluded: 1 },
        first_date: "2019-04-01",
      },
      members: [
        { ordinal: 1, slug: "ncell-1", court_case_numbers: ["075-WO-0012"] },
        { ordinal: 2, slug: "ncell-2", court_case_numbers: [] },
        { ordinal: 3, slug: "ncell-3", court_case_numbers: [] },
      ],
      member_count: 3,
      matched_member_count: 3,
      latest_date: "2025-05-10",
      thumbnail: null,
      thumbnail_url: null,
      ...card,
    } as unknown as ArchiveSearchResult["card"],
  } as ArchiveSearchResult;
}

function caseResult(slug: string, title: string): ArchiveSearchResult {
  return {
    type: "case",
    id: `https://jawafdehi.org/case/${slug}`,
    source_app: "jawafdehi",
    title: { ne: title, en: null },
    snippet: {},
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
  } as ArchiveSearchResult;
}

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeAll(async () => {
  await i18n.changeLanguage("ne");
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

afterEach(cleanup);

describe("seriesListingCardOf", () => {
  it("reads a collapsed-listing item", () => {
    const card = seriesListingCardOf(seriesListingResult());
    expect(card?.slug).toBe("ncell-tax-dispute");
    expect(card?.member_count).toBe(3);
    expect(card?.matched_member_count).toBe(3);
    expect(card?.latest_date).toBe("2025-05-10");
  });

  it("leaves a plain series SEARCH hit (no member_count) to the search card", () => {
    const hit = seriesListingResult();
    const { member_count: _m, matched_member_count: _n, ...searchCard } = hit.card as unknown as SeriesListingCard;
    expect(seriesListingCardOf({ ...hit, card: searchCard as unknown as ArchiveSearchResult["card"] })).toBeNull();
  });

  it("ignores cases", () => {
    expect(seriesListingCardOf(caseResult("a", "क"))).toBeNull();
  });
});

describe("seriesHeadlineBigo", () => {
  it("prefers the distinct-claims total, else the largest claim, never a sum", () => {
    const bigo_max = { amount: 900, member_slug: "a" };
    expect(seriesHeadlineBigo({ bigo_max, bigo_total: 1200 })).toEqual({ kind: "total", amount: 1200 });
    expect(seriesHeadlineBigo({ bigo_max })).toEqual({ kind: "largest", amount: 900 });
    expect(seriesHeadlineBigo({ bigo_max, bigo_total: null })).toEqual({ kind: "largest", amount: 900 });
    expect(seriesHeadlineBigo({ bigo_max: null })).toBeNull();
  });
});

describe("<SeriesListCard>", () => {
  it("renders the kicker, title, case count, statuses, बिगो and latest date", () => {
    wrap(<SeriesListCard card={seriesListingCardOf(seriesListingResult())!} />);
    const card = screen.getByTestId("series-list-card");
    expect(within(card).getByText("मुद्दा शृङ्खला")).toBeTruthy();
    expect(within(card).getByText("३ मुद्दा")).toBeTruthy();
    const title = within(card).getByRole("link", { name: "एनसेल कर विवाद" });
    expect(title.getAttribute("href")).toBe("/series/ncell-tax-dispute/");
    expect(within(card).getByRole("link", { name: "शृङ्खला हेर्नुहोस्" }).getAttribute("href")).toBe(
      "/series/ncell-tax-dispute/",
    );
    const statuses = within(card).getByRole("list", { name: "स्थिति" });
    expect(statuses.textContent).toContain("२ चलिरहेको");
    expect(statuses.textContent).toContain("१ टुङ्गिएको");
    expect(card.textContent).toContain("सबैभन्दा ठूलो बिगो दाबी");
    // 2025-05-10 AD is 2082 Baisakh 27 BS.
    expect(card.textContent).toMatch(/पछिल्लो मुद्दा:\s*२०८२ बैशाख २७/);
    // Unfiltered: no "matches" chip.
    expect(card.textContent).not.toContain("यो छनोटमा");
  });

  it("shows the distinct-claims total when the API sends one", () => {
    const listing = seriesListingResult();
    const card = seriesListingCardOf(listing)!;
    wrap(<SeriesListCard card={{ ...card, totals: { ...card.totals, bigo_total: 50_000_000 } }} />);
    expect(screen.getByTestId("series-list-card").textContent).toContain("जम्मा बिगो (छुट्टाछुट्टै दाबी)");
  });

  it("says how many members matched a filter", () => {
    wrap(<SeriesListCard card={seriesListingCardOf(seriesListingResult({ matched_member_count: 1 }))!} />);
    expect(screen.getByText("यो छनोटमा १")).toBeTruthy();
  });

  it("lets link clicks bubble, so the search page's result-click tracking sees them", () => {
    const seen = vi.fn();
    wrap(
      <div onClick={seen}>
        <SeriesListCard card={seriesListingCardOf(seriesListingResult())!} />
      </div>,
    );
    fireEvent.click(screen.getByRole("link", { name: "एनसेल कर विवाद" }));
    fireEvent.click(screen.getByRole("link", { name: "शृङ्खला हेर्नुहोस्" }));
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("renders in English", async () => {
    await i18n.changeLanguage("en");
    try {
      wrap(<SeriesListCard card={seriesListingCardOf(seriesListingResult())!} />);
      const card = screen.getByTestId("series-list-card");
      expect(within(card).getByRole("link", { name: "Ncell tax dispute" })).toBeTruthy();
      expect(card.textContent).toContain("3 cases");
      expect(card.textContent).toContain("Largest embezzled amount");
      expect(card.textContent).toContain("View series");
    } finally {
      await i18n.changeLanguage("ne");
    }
  });
});

describe("mixed listings", () => {
  it("the homepage grid renders one series card among case cards", () => {
    wrap(
      <FeaturedCaseGrid
        language="ne"
        results={[caseResult("a", "मुद्दा क"), seriesListingResult(), caseResult("b", "मुद्दा ख")]}
      />,
    );
    expect(screen.getAllByTestId("series-list-card")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "मुद्दा क" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "मुद्दा ख" })).toBeTruthy();
  });

  it("an old API's plain cases render as case cards, as before", () => {
    wrap(<FeaturedCaseGrid language="ne" results={[caseResult("a", "मुद्दा क"), caseResult("b", "मुद्दा ख")]} />);
    expect(screen.queryByTestId("series-list-card")).toBeNull();
    expect(screen.getAllByRole("link", { name: /मुद्दा [कख]/ })).toHaveLength(2);
  });

  it("the search dispatcher gives a listing item the list card and a search hit the search card", () => {
    wrap(<SearchResultCard result={seriesListingResult()} viewMode="card" />);
    expect(screen.getByTestId("series-list-card")).toBeTruthy();
    cleanup();
    const hit = seriesListingResult();
    const { member_count: _m, ...searchCard } = hit.card as unknown as SeriesListingCard;
    wrap(
      <SearchResultCard
        result={{ ...hit, card: searchCard as unknown as ArchiveSearchResult["card"] }}
        viewMode="card"
      />,
    );
    expect(screen.queryByTestId("series-list-card")).toBeNull();
    expect(screen.getByRole("link", { name: "एनसेल कर विवाद" })).toBeTruthy();
  });
});
