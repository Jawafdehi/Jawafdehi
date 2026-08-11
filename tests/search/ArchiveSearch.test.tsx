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
    status: [{ name: "ongoing", count: 5 }],
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

// A case hit carrying the denormalized index card payload (the common path on
// new docs), so <CaseCard> renders without hydrating the detail endpoint.
function caseResult(
  slug: string,
  title: string,
  card: Partial<NonNullable<ArchiveSearchResult["card"]>> = {},
): ArchiveSearchResult {
  return {
    ...baseResponse.results[0],
    id: `https://jawafdehi.org/case/${slug}`,
    title: { ne: null, en: title },
    url: `/case/${slug}`,
    card: {
      slug,
      title,
      short_description: `${title} summary`,
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
      ...card,
    },
  };
}

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
    // One skeleton, not one per viewport: the filter panel is rendered once and
    // positioned with CSS, so the loading placeholder is single too.
    expect(document.querySelectorAll('aside[aria-hidden="true"]').length).toBe(
      1,
    );
    expect(
      document.querySelector('div[aria-live="polite"] [aria-hidden="true"]'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "Archive search results" })
        .getAttribute("aria-busy"),
    ).toBe("true");
    // Default record type is "all" (the full unified corpus). "all" means no
    // `type` filter is sent to the API (undefined), and the URL carries type=all.
    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ page_size: 12, type: undefined }),
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
      screen.getByRole("checkbox", {
        name: "CIAA: 6 results",
      }),
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("checkbox", { name: "CIAA: 6 results" })
          .getAttribute("data-state"),
      ).toBe("checked");
    });
    expect(screen.getAllByText("Filters").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("status", { name: "Searching archive" }),
    ).toBeTruthy();
    expect(
      document.querySelector('div[aria-live="polite"] [aria-hidden="true"]'),
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
        .getByRole("radio", { name: "All records" })
        .getAttribute("data-state"),
    ).toBe("checked");
    // "all" sends no type filter to the API.
    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
    );

    fireEvent.click(screen.getByRole("radio", { name: "Cases: 8 results" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toContain(
        "type=case",
      );
    });
    expect(
      screen
        .getByRole("radio", { name: "Cases: 8 results" })
        .getAttribute("data-state"),
    ).toBe("checked");
    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "case" }),
    );
  });

  it("shows the Entity type filter only while browsing Entities", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch();
    await screen.findByText("Original result");

    // Default "All records" view: Entity type is hidden (its buckets are
    // either irrelevant or, as originally reported, collapse to one
    // confusing value when browsing anything other than Entities).
    expect(screen.queryByText("Entity type")).toBeNull();

    fireEvent.click(
      screen.getByRole("radio", { name: "Entities: 3 results" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Entity type")).toBeTruthy();
    });
    expect(
      screen.getByRole("checkbox", { name: "Person: 4 results" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Cases: 8 results" }));

    await waitFor(() => {
      expect(screen.queryByText("Entity type")).toBeNull();
    });
  });

  it("drops a selected entity type when switching to another record type", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch("/search?type=entity");
    await screen.findByText("Original result");

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Person: 4 results" }),
    );

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ entity_type: ["Person"], type: "entity" }),
      );
    });

    // Switching record type must not leave the (now hidden) Entity type facet
    // filtering the results behind the user's back.
    fireEvent.click(screen.getByRole("radio", { name: "Cases: 8 results" }));

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ entity_type: [], type: "case" }),
      );
    });
    expect(screen.getByTestId("location-search").textContent).not.toContain(
      "entity_type",
    );
  });

  it("ignores an entity_type carried in by a non-entity URL", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch("/search?type=case&entity_type=Person");
    await screen.findByText("Original result");

    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ entity_type: [], type: "case" }),
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

  it("renders enriched case cards without hydrating the detail endpoint", async () => {
    searchArchiveMock.mockResolvedValue({
      ...baseResponse,
      results: [
        {
          ...baseResponse.results[0],
          card: {
            slug: "original-result",
            title: "Indexed card title",
            short_description: "Indexed card summary",
            key_allegations: ["Indexed allegation"],
            tags: ["indexed-tag"],
            case_type: "CORRUPTION",
            status: "ongoing",
            case_start_date: "2024-01-01",
            case_end_date: null,
            bigo: null,
            thumbnail_url: "https://example.com/indexed-card.jpg",
            banner_url: null,
            timeline: [],
            entities: [
              {
                nes_id: "https://jawafdehi.org/entity/person/indexed",
                display_name: "Indexed Person",
                entity_type: "Person",
                type: "accused",
              },
            ],
          },
        },
      ],
    });

    renderSearch();
    await screen.findByText("Indexed card title");

    // The card leads with the title and the facts below it — the summary
    // paragraph lives on the case detail page, not on the card.
    expect(screen.queryByText("Indexed card summary")).toBeNull();
    expect(screen.getByText("Indexed Person")).toBeTruthy();
    expect(document.querySelector('img[src="https://example.com/indexed-card.jpg"]')).toBeTruthy();
    expect(getCaseByIdMock).not.toHaveBeenCalled();
  });

  it("opens in card view", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch();
    await screen.findByText("Original result");

    expect(
      screen.getByRole("button", { name: "Card view" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "List view" }).getAttribute("aria-pressed"),
    ).toBe("false");

    // Card sits first in the toggle, so the default view leads.
    const toggles = Array.from(
      screen
        .getByRole("group", { name: "View mode" })
        .querySelectorAll("button"),
    ).map((button) => button.getAttribute("aria-label"));
    expect(toggles).toEqual(["Card view", "List view"]);
  });

  it("shows बिगो on case cards in both views, and omits it when there is no amount", async () => {
    searchArchiveMock.mockResolvedValue({
      ...baseResponse,
      results: [
        caseResult("with-amount", "Case with an amount", { bigo: 24_940_110 }),
        caseResult("zero-amount", "Case with a zero amount", { bigo: 0 }),
        caseResult("no-amount", "Case with no amount", { bigo: null }),
      ],
    });

    renderSearch();
    await screen.findByText("Case with an amount");

    // Card view (the default).
    expect(screen.getByText("Rs 2.49 Crore")).toBeTruthy();
    // A 0/null amount means "no amount recorded", not "nothing was embezzled" —
    // rendering formatBigo(0) as "Rs 0" would assert a finding the case doesn't make.
    expect(screen.queryByText("Rs 0")).toBeNull();

    // Same field in list view: <CaseCard>'s meta block is not mode-branched, so
    // one mapping fix surfaces बिगो in both.
    fireEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(screen.getByText("Rs 2.49 Crore")).toBeTruthy();
    expect(screen.queryByText("Rs 0")).toBeNull();
  });

  it("shows the same fields for a non-case result in both views", async () => {
    searchArchiveMock.mockResolvedValue({
      ...baseResponse,
      results: [
        {
          type: "courtcase",
          id: "https://jawafdehi.org/courtcase/special/081-cr-0060",
          source_app: "jawafdehi",
          title: { ne: null, en: "Special Court 081-CR-0060" },
          snippet: { ne: null, en: "Charge sheet filed against the accused" },
          url: "/courtcase/special/081-cr-0060",
          api_url: null,
          matched_fields: [],
          score: 1,
          extra: {
            court: "SPECIAL_COURT",
            case_number: "081-CR-0060",
            case_status: "SUB_JUDICE",
          },
        },
      ],
    });

    renderSearch();
    await screen.findByText("Special Court 081-CR-0060");

    // The metadata line used to be `truncate`d to one line in card view while the
    // list row wrapped it in full, hiding the court and status. That regression is
    // CSS-only, and jsdom has no layout — asserting the text is present would pass
    // against the broken code too. So compare the classes that decide how much of
    // each field is shown, not just that the field exists.
    const renderedFields = () => ({
      badge: screen.getByText("Court case").textContent,
      title: screen.getByText("Special Court 081-CR-0060").textContent,
      description: screen.getByText("Charge sheet filed against the accused")
        .textContent,
      metadata: screen.getByText("special court · 081-CR-0060 · sub judice")
        .textContent,
      cta: screen.getByText("View").textContent,
      // Description and metadata are clamped identically in both modes; only the
      // title scales with the shell, so its classes are compared separately below.
      descriptionClamp: screen.getByText("Charge sheet filed against the accused")
        .className,
      metadataClamp: screen.getByText("special court · 081-CR-0060 · sub judice")
        .className,
    });

    const cardView = renderedFields();
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    const listView = renderedFields();

    expect(listView).toEqual(cardView);
    // Neither mode may truncate a field to a single line.
    expect(cardView.metadataClamp).not.toContain("truncate");
    expect(cardView.descriptionClamp).not.toContain("truncate");
    // The title clamps to the same number of lines in both, at different sizes,
    // and sits at the same heading level as <CaseCard>'s title (h3) rather than
    // the h2 the list row used to render.
    const heading = () =>
      screen.getByRole("heading", { level: 3, name: "Special Court 081-CR-0060" });
    expect(heading().className).toContain("line-clamp-2");
    fireEvent.click(screen.getByRole("button", { name: "Card view" }));
    expect(heading().className).toContain("line-clamp-2");
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
      screen.getByRole("checkbox", {
        name: "CIAA: 6 results",
      }),
    );

    expect(
      await screen.findByText("Archive search could not be loaded."),
    ).toBeTruthy();
    expect(screen.getAllByText("Filters").length).toBeGreaterThan(0);
    expect(screen.queryByText("Original result")).toBeNull();
    expect(screen.queryByText("No archive records found")).toBeNull();
  });

  // Browsing with no query text is a curated shelf, not a ranking: OpenSearch
  // gives every document an identical score, so `relevance` would collapse to the
  // `iri` tiebreaker and order the archive alphabetically by slug.
  it("sorts by editorial weight while browsing without a query", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch("/search?type=case");

    await waitFor(() =>
      expect(searchArchiveMock).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "featured", type: "case" }),
      ),
    );
  });

  it("sorts by relevance once there is query text", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch("/search?type=case&q=ncell");

    await waitFor(() =>
      expect(searchArchiveMock).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "relevance", q: "ncell" }),
      ),
    );
  });

  // Regression guard: `sort` must stay out of archive-search-params' defaultValues.
  // Listing it there strips ?sort=relevance from the URL, and the browse default
  // then re-resolves it to `featured` — silently reverting the user's choice.
  it("honours an explicitly chosen relevance sort while browsing", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch("/search?type=case&sort=relevance");

    await waitFor(() =>
      expect(searchArchiveMock).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "relevance" }),
      ),
    );
    expect(searchArchiveMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ sort: "featured" }),
    );
  });

  // The panel was previously rendered twice — into a mobile <details> and into
  // the desktop sidebar — so every facet control existed twice in the DOM at
  // every viewport while at most one set was ever visible. It is now rendered
  // once and positioned by `display`; these tests pin that contract, since a
  // regression is invisible on screen and only shows up as payload and
  // hydration cost. (The getBy* queries in the tests above guard it too: they
  // throw on a second match.)
  describe("single filter panel", () => {
    it("renders the facet controls and the landmark exactly once", async () => {
      searchArchiveMock.mockResolvedValue(baseResponse);
      renderSearch();
      await screen.findByText("Original result");

      expect(
        document.querySelectorAll('aside[aria-label="Archive search filters"]')
          .length,
      ).toBe(1);
      expect(screen.getAllByRole("checkbox").length).toBe(2);
      expect(screen.getAllByRole("radio").length).toBe(5);
      expect(document.querySelectorAll("details").length).toBe(0);
    });

    it("keeps the single panel in the desktop sidebar while collapsed on mobile", async () => {
      searchArchiveMock.mockResolvedValue(baseResponse);
      renderSearch();
      await screen.findByText("Original result");

      const toggle = screen.getByRole("button", { name: "Filters" });
      const panel = document.getElementById(
        toggle.getAttribute("aria-controls") || "",
      );

      // Collapsed on phones, but `lg:block` still reveals the same node as the
      // desktop sidebar — that pairing is what makes one instance serve both,
      // with no breakpoint hook and so no pre-render/hydration mismatch.
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(toggle.className).toContain("lg:hidden");
      expect(panel?.className).toContain("hidden");
      expect(panel?.className).toContain("lg:block");
      expect(panel?.querySelector('aside[aria-label="Archive search filters"]'))
        .toBeTruthy();
    });

    it("expands and collapses the panel on mobile and counts active refinements", async () => {
      searchArchiveMock.mockResolvedValue(baseResponse);
      renderSearch();
      await screen.findByText("Original result");

      const toggle = screen.getByRole("button", { name: "Filters" });
      const panel = document.getElementById(
        toggle.getAttribute("aria-controls") || "",
      );

      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(panel?.className).not.toContain("hidden");

      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(panel?.className).toContain("hidden");

      // The collapsed control has to report how many refinements are hidden
      // behind it, the way the old <summary> did.
      fireEvent.click(screen.getByRole("checkbox", { name: "CIAA: 6 results" }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Filters (1)" })).toBeTruthy();
      });
    });
  });
});
