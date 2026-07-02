import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ArchiveSearch from "@/pages/ArchiveSearch";
import type { ArchiveSearchResponse } from "@/types/search";

const { getCaseByIdMock, searchArchiveMock } = vi.hoisted(() => ({
  getCaseByIdMock: vi.fn(),
  searchArchiveMock: vi.fn(),
}));

vi.mock("@/services/search-api", () => ({
  searchArchive: searchArchiveMock,
}));

vi.mock("@/services/jds-api", () => ({
  getCaseById: getCaseByIdMock,
}));

const baseResponse: ArchiveSearchResponse = {
  query: "",
  lang: "both",
  sort: "relevance",
  page: 1,
  page_size: 10,
  count: 12,
  counts: {
    case: 8,
    entity: 3,
    material: 1,
    courtcase: 0,
  },
  facets: {
    entity_type: [{ name: "Person", count: 4 }],
    case_type: [{ name: "CORRUPTION", count: 7 }],
    tags: [{ name: "CIAA", count: 6 }],
  },
  results: [
    {
      type: "case",
      id: "https://jawafdehi.org/case/original-result",
      source_app: "jawafdehi",
      title: { ne: null, en: "Original result" },
      snippet: { ne: null, en: "Original description" },
      url: "/case/original-result",
      api_url: "/api/cases/original-result/",
      matched_fields: [],
      score: 1,
      extra: { case_type: "CORRUPTION" },
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function LocationState() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderSearch(initialEntry = "/search") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              element={
                <>
                  <ArchiveSearch />
                  <LocationState />
                </>
              }
              path="/search"
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe("ArchiveSearch", () => {
  beforeEach(() => {
    getCaseByIdMock.mockReset();
    getCaseByIdMock.mockResolvedValue({
      banner_url: null,
      thumbnail_url: "https://example.com/case-thumbnail.jpg",
      tags: ["CIAA"],
      entities: [],
    });
    searchArchiveMock.mockReset();
  });

  it("shows filter, count, and result skeletons on the initial load", () => {
    searchArchiveMock.mockReturnValue(new Promise(() => undefined));

    renderSearch();

    expect(
      screen.getByRole("status", { name: "Searching archive" }),
    ).toBeTruthy();
    expect(document.querySelectorAll('aside[aria-hidden="true"]').length).toBe(
      2,
    );
    expect(
      document.querySelector('p[aria-live="polite"] [aria-hidden="true"]'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "Archive search results" })
        .getAttribute("aria-busy"),
    ).toBe("true");
    // Default record type is "all" (the full unified corpus). "all" means no
    // `type` filter is sent to the API (undefined), and the URL carries type=all.
    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ page_size: 4, type: undefined }),
    );
    expect(screen.getByTestId("location-search").textContent).toBe(
      "?type=all",
    );
  });

  it("keeps filters stable but replaces results during a refresh", async () => {
    const refresh = deferred<ArchiveSearchResponse>();
    searchArchiveMock
      .mockResolvedValueOnce(baseResponse)
      .mockReturnValueOnce(refresh.promise);

    renderSearch();
    await screen.findByText("Original result");

    fireEvent.click(
      screen.getAllByRole("checkbox", {
        name: "Person: 4 results",
      })[0],
    );

    await waitFor(() => {
      expect(
        screen
          .getAllByRole("checkbox", { name: "Person: 4 results" })[0]
          .getAttribute("data-state"),
      ).toBe("checked");
    });
    expect(screen.getAllByText("Filters").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("status", { name: "Searching archive" }),
    ).toBeTruthy();
    expect(
      document.querySelector('p[aria-live="polite"] [aria-hidden="true"]'),
    ).toBeTruthy();
    expect(screen.queryByText("Original result")).toBeNull();
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
    expect(
      screen
        .getByRole("region", { name: "Archive search results" })
        .getAttribute("aria-busy"),
    ).toBe("true");

    refresh.resolve({
      ...baseResponse,
      count: 1,
      results: [
        {
          ...baseResponse.results[0],
          id: "https://jawafdehi.org/case/filtered-result",
          title: { ne: null, en: "Filtered result" },
          url: "/case/filtered-result",
        },
      ],
    });

    expect(await screen.findByText("Filtered result")).toBeTruthy();
  });

  it("defaults to All records and switches to a single record type", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch();
    await screen.findByText("Original result");

    // Default selection is "All records" (the full unified corpus).
    expect(
      screen
        .getAllByRole("radio", { name: "All records" })[0]
        .getAttribute("data-state"),
    ).toBe("checked");
    // "all" sends no type filter to the API.
    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
    );

    fireEvent.click(screen.getAllByRole("radio", { name: "Cases: 8 results" })[0]);

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toContain(
        "type=case",
      );
    });
    expect(
      screen
        .getAllByRole("radio", { name: "Cases: 8 results" })[0]
        .getAttribute("data-state"),
    ).toBe("checked");
    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "case" }),
    );
  });

  it("adds a hydrated case tag as a URL refinement", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch();
    await screen.findByText("Original result");

    // The card tag (hydrated from the case detail) is a clickable button; the
    // sidebar tags facet renders as a checkbox, so this button match is unique.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "CIAA" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "CIAA" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toContain(
        "tags=CIAA",
      );
    });
  });

  it("loads case artwork from the detail response", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch();
    await screen.findByText("Original result");

    await waitFor(() => {
      expect(
        document.querySelector(
          'img[src="https://example.com/case-thumbnail.jpg"]',
        ),
      ).toBeTruthy();
    });
    expect(getCaseByIdMock).toHaveBeenCalledWith("original-result");
  });

  it("does not show an empty state after an initial request failure", async () => {
    searchArchiveMock.mockRejectedValue(new Error("Unavailable"));
    renderSearch();

    expect(
      await screen.findByText("Archive search could not be loaded."),
    ).toBeTruthy();
    expect(screen.queryByText("No archive records found")).toBeNull();
    expect(screen.queryByText("Filters")).toBeNull();
  });

  it("keeps filters but hides stale results after a refresh failure", async () => {
    searchArchiveMock
      .mockResolvedValueOnce(baseResponse)
      .mockRejectedValueOnce(new Error("Unavailable"));
    renderSearch();
    await screen.findByText("Original result");

    fireEvent.click(
      screen.getAllByRole("checkbox", {
        name: "Person: 4 results",
      })[0],
    );

    expect(
      await screen.findByText("Archive search could not be loaded."),
    ).toBeTruthy();
    expect(screen.getAllByText("Filters").length).toBeGreaterThan(0);
    expect(screen.queryByText("Original result")).toBeNull();
    expect(screen.queryByText("No archive records found")).toBeNull();
  });
});
