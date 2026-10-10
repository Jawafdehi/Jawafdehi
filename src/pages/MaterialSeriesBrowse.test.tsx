import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArchiveSearchParams, ArchiveSearchResponse } from "@/types/search";

const searchArchive = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      "materialsLanding.filters.presets.all": "All time",
      "materialsLanding.filters.presets.30-days": "Last 30 days",
      "materialsLanding.filters.presets.6-months": "Last 6 months",
      "materialsLanding.filters.presets.1-year": "Last year",
      "materialsLanding.filters.clear": "Clear filters",
    };
    return {
      i18n: { language: "en" },
      t: (
        key: string,
        fallbackOrOptions?: string | Record<string, unknown>,
        interpolation?: Record<string, unknown>,
      ) => {
        const fallback =
          translations[key] ??
          (typeof fallbackOrOptions === "string" ? fallbackOrOptions : key);
        const values =
          (typeof fallbackOrOptions === "object"
            ? fallbackOrOptions
            : interpolation) ?? {};
        return fallback.replace(/{{(\w+)}}/g, (_, name: string) =>
          String(values[name] ?? ""),
        );
      },
    };
  },
}));

vi.mock("@/components/Seo", () => ({ default: () => null }));
vi.mock("@/components/ShareButton", () => ({ ShareButton: () => null }));
vi.mock("@/services/search-api", () => ({
  searchArchive: (...args: unknown[]) => searchArchive(...args),
}));

import MaterialSeriesBrowse from "@/pages/MaterialSeriesBrowse";

function hit(id: string, title: string, date: string) {
  return {
    type: "material",
    id: `https://jawafdehi.org/material/ag/${id}`,
    source_app: "ngm",
    title: { ne: null, en: title },
    snippet: { ne: null, en: null },
    score: 1,
    url: `/material/ag/${id}`,
    api_url: null,
    matched_fields: [],
    extra: { date },
  };
}

function response(results: unknown[], count = results.length): ArchiveSearchResponse {
  return {
    query: "",
    lang: "both",
    sort: "newest",
    page: 1,
    page_size: 50,
    count,
    counts: { material: count },
    facets: {},
    results,
    next_cursor: null,
    did_you_mean: null,
  } as unknown as ArchiveSearchResponse;
}

let currentSearch = "";

function LocationProbe() {
  currentSearch = useLocation().search;
  return null;
}

function renderPage(
  initial = "/materials/?series=charge-sheets",
  slug = "charge-sheets",
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route
            path="/materials/"
            element={
              <>
                <LocationProbe />
                <MaterialSeriesBrowse slug={slug} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function lastParams(): ArchiveSearchParams {
  return searchArchive.mock.calls.at(-1)![0] as ArchiveSearchParams;
}

beforeEach(() => {
  // jsdom implements no layout, and Radix Select calls this on open.
  Element.prototype.scrollIntoView = vi.fn();
  searchArchive.mockReset();
  currentSearch = "";
});

describe("MaterialSeriesBrowse", () => {
  it("scopes the search to the series' source and sorts newest first", async () => {
    searchArchive.mockResolvedValue(
      response([hit("1", "Newer", "2024-01-02"), hit("2", "Older", "2020-01-02")]),
    );
    renderPage();

    await waitFor(() => expect(searchArchive).toHaveBeenCalled());
    const params = lastParams();
    // `ag` is the charge-sheets series' data-lake source token.
    expect(params.source).toEqual(["ag"]);
    expect(params.type).toBe("material");
    // Reverse-chronological is the default, and it is the SERVER that applies it —
    // the old page sorted only the rows already fetched.
    expect(params.sort).toBe("newest");
  });

  // The five Auditor General shelves all scope `official_report`, so source
  // alone no longer identifies a shelf. seriesScope() is unit-tested; these
  // pin that this page actually FORWARDS it to the API.
  it("narrows a kind shelf to its document bucket, not just its source", async () => {
    searchArchive.mockResolvedValue(response([hit("1", "54th Annual Report", "2024-01-02")]));
    renderPage("/materials/?series=auditor-general-reports", "auditor-general-reports");

    await waitFor(() => expect(searchArchive).toHaveBeenCalled());
    const params = lastParams();
    expect(params.source).toEqual(["official_report"]);
    expect(params.dataset_bucket).toEqual(["report_annual-report"]);
    // A kind shelf must not ALSO exclude, or it would scope to nothing.
    expect(params.dataset_bucket_exclude).toBeUndefined();
  });

  it("sends the complement shelf as an exclusion of its four siblings", async () => {
    searchArchive.mockResolvedValue(response([hit("1", "An RTI report", "2024-01-02")]));
    renderPage("/materials/?series=oag-publications", "oag-publications");

    await waitFor(() => expect(searchArchive).toHaveBeenCalled());
    const params = lastParams();
    expect(params.source).toEqual(["official_report"]);
    expect(params.dataset_bucket).toBeUndefined();
    // Stated as an exclusion, so a bucket the registry has never heard of still
    // lands here rather than vanishing from the site entirely.
    expect(params.dataset_bucket_exclude).toEqual([
      "report_annual-report",
      "report_province-report",
      "publication_audit-journals",
      "publication_audit-bulletin",
    ]);
  });

  it("does not serve one Auditor General shelf's documents on another", async () => {
    // The query is cached for 5 minutes, so a cache key that ignored the kind
    // would show the annual reports on the journal page WITHOUT a refetch —
    // silently, and only for the second visitor of the pair.
    searchArchive.mockImplementation((params: ArchiveSearchParams) =>
      Promise.resolve(
        response([
          params.dataset_bucket?.[0] === "publication_audit-journals"
            ? hit("2", "Journal of Government Auditing", "2024-01-02")
            : hit("1", "54th Annual Report", "2024-01-02"),
        ]),
      ),
    );
    const shared = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderPage(
      "/materials/?series=auditor-general-reports",
      "auditor-general-reports",
      shared,
    );
    await waitFor(() => expect(screen.getByText("54th Annual Report")).toBeDefined());

    renderPage("/materials/?series=audit-journal", "audit-journal", shared);
    await waitFor(() =>
      expect(screen.getByText("Journal of Government Auditing")).toBeDefined(),
    );
    expect(searchArchive).toHaveBeenCalledTimes(2);
  });

  it("reports the corpus total, not the number of rows fetched", async () => {
    searchArchive.mockResolvedValue(response([hit("1", "One", "2024-01-02")], 99750));
    renderPage();

    // The old label said "Showing 1 of 1 loaded", which described the fetch rather
    // than the series.
    expect(await screen.findByText("1 of 99,750")).toBeTruthy();
  });

  it("puts a search into the URL so the view is linkable", async () => {
    searchArchive.mockResolvedValue(response([]));
    renderPage();
    await waitFor(() => expect(searchArchive).toHaveBeenCalled());

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "भ्रष्टाचार" } });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(new URLSearchParams(currentSearch).get("q")).toBe("भ्रष्टाचार"));
    // …and the series scope survives alongside it, which is the whole point of
    // letting ?series= win over ?q=.
    expect(new URLSearchParams(currentSearch).get("series")).toBe("charge-sheets");
    await waitFor(() => expect(lastParams().q).toBe("भ्रष्टाचार"));
  });

  it("reads its controls back out of the URL on load", async () => {
    searchArchive.mockResolvedValue(response([]));
    renderPage("/materials/?series=charge-sheets&q=ujuri&sort=oldest&from=2020-01-01");

    await waitFor(() => expect(searchArchive).toHaveBeenCalled());
    const params = lastParams();
    expect(params.q).toBe("ujuri");
    expect(params.sort).toBe("oldest");
    expect(params.date_from).toBe("2020-01-01");
  });

  it("sends the date range to the server rather than filtering in the browser", async () => {
    searchArchive.mockResolvedValue(response([]));
    renderPage();
    await waitFor(() => expect(searchArchive).toHaveBeenCalled());

    const start = document.getElementById("materials-filter-desktop-start")!;
    fireEvent.change(start, { target: { value: "2021-03-01" } });

    await waitFor(() => expect(lastParams().date_from).toBe("2021-03-01"));
    expect(new URLSearchParams(currentSearch).get("from")).toBe("2021-03-01");
  });

  it("does not search at all when the range is inverted", async () => {
    searchArchive.mockResolvedValue(response([]));
    renderPage("/materials/?series=charge-sheets&from=2024-01-01&to=2020-01-01");

    await waitFor(() => expect(screen.getByText(/0 of 0/)).toBeTruthy());
    expect(searchArchive).not.toHaveBeenCalled();
  });

  it("changing the sort rewrites the URL and refetches", async () => {
    searchArchive.mockResolvedValue(response([]));
    renderPage();
    await waitFor(() => expect(searchArchive).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText("Sort"));
    fireEvent.click(await screen.findByText("Oldest first"));

    await waitFor(() => expect(new URLSearchParams(currentSearch).get("sort")).toBe("oldest"));
    await waitFor(() => expect(lastParams().sort).toBe("oldest"));
  });

  it("asks for the next page only while rows remain", async () => {
    searchArchive.mockResolvedValue(response([hit("1", "One", "2024-01-02")], 2));
    renderPage();

    const loadMore = await screen.findByRole("button", { name: "Load more" });
    fireEvent.click(loadMore);

    await waitFor(() => expect(lastParams().page).toBe(2));
  });

  it("ignores an unrecognised date preset instead of filtering to today", async () => {
    // Regression: these values became URL-supplied in this change, and an unknown
    // one matched no branch in presetStartDate and so returned TODAY — silently
    // emptying the series with nothing to indicate the URL caused it.
    searchArchive.mockResolvedValue(response([hit("1", "One", "2020-01-02")]));
    renderPage("/materials/?series=charge-sheets&when=garbage");

    await waitFor(() => expect(searchArchive).toHaveBeenCalled());
    expect(lastParams().date_from).toBeUndefined();
  });

  it("drops a malformed date bound rather than forwarding it", async () => {
    // A bound the API cannot parse is a 400, which the reader would see as an
    // unexplained empty page.
    searchArchive.mockResolvedValue(response([]));
    renderPage("/materials/?series=charge-sheets&from=not-a-date&to=2024-13-99");

    await waitFor(() => expect(searchArchive).toHaveBeenCalled());
    expect(lastParams().date_from).toBeUndefined();
    expect(lastParams().date_to).toBeUndefined();
  });

  it("offers to clear the filters when a search matches nothing", async () => {
    searchArchive.mockResolvedValue(response([]));
    renderPage("/materials/?series=charge-sheets&q=nothingmatchesthis");

    expect(await screen.findByText("No documents match these filters.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
  });
});
