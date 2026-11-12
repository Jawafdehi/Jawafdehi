import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

import "../support/resize-observer";

const { getCaseByIdMock, getMaterialMock, searchArchiveMock } = vi.hoisted(() => ({
  getCaseByIdMock: vi.fn(),
  getMaterialMock: vi.fn(),
  searchArchiveMock: vi.fn(),
}));

vi.mock("@/services/search-api", () => ({
  searchArchive: searchArchiveMock,
}));

vi.mock("@/services/jds-api", () => ({
  getCaseById: getCaseByIdMock,
}));

// Material rows hydrate their download/source buttons from the detail API;
// keep the rest of the module (materialTail etc.) real.
vi.mock("@/services/datalake-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/datalake-api")>();
  return {
    ...actual,
    getMaterial: (...args: unknown[]) => getMaterialMock(...args),
  };
});

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
    court: [],
    court_type: [],
    district: [],
    province: [],
    material_type: [],
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

const courtFacetResponse: ArchiveSearchResponse = {
  ...baseResponse,
  count: 5_477,
  counts: { courtcase: 5_477 },
  facets: {
    ...baseResponse.facets,
    court: [{ name: "kathmandudc", count: 5_477 }],
    court_type: [{ name: "district", count: 14_307 }],
    district: [{ name: "Kathmandu", count: 5_477 }],
    province: [{ name: "Bagmati", count: 7_617 }],
  },
  results: [
    {
      ...baseResponse.results[0],
      type: "courtcase",
      id: "https://jawafdehi.org/courtcase/kathmandudc/083-c1-1430",
      title: { ne: null, en: "District Court Kathmandu 083-C1-1430" },
      url: "/courtcase/kathmandudc/083-c1-1430",
      extra: {
        court: "kathmandudc",
        court_type: "district",
      },
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

/**
 * The value of one labelled metadata row on a material card. Rows render as
 * `<dt>Series:</dt><dd>…</dd>`, so the value is read through its label rather
 * than by matching a whole meta line as one string.
 */
function metaValue(label: string): string | undefined {
  const term = screen.getByText(`${label}:`);
  return term.parentElement?.querySelector("dd")?.textContent ?? undefined;
}

function LocationState() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

// The corpus extent the बिगो control needs to render at all. Absent from
// `baseResponse` on purpose, so every other test keeps exercising the
// no-extent path (an older cached response, or a corpus before the reindex).
const withBigoExtent: ArchiveSearchResponse = {
  ...baseResponse,
  extents: { bigo: { min: 45_220, max: 66_000_000_000, count: 75 } },
};

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

// The filters live in the chip row's "All filters" sheet (and each chip's
// popover); a test that ticks a box opens the sheet first, as a reader would.
function openAllFilters() {
  fireEvent.click(screen.getByRole("button", { name: /All filters/ }));
  return screen.getByRole("dialog");
}

// While the sheet is open the rest of the page is hidden from the
// accessibility tree, as it should be; close it to reach the tabs and results.
function closeAllFilters() {
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
}

/** Tick one facet box the way a reader does: open, tick, close. */
function tick(name: string) {
  openAllFilters();
  fireEvent.click(screen.getByRole("checkbox", { name }));
  closeAllFilters();
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
    getMaterialMock.mockReset();
  });

  it("shows filter, count, and result skeletons on the initial load", () => {
    searchArchiveMock.mockReturnValue(new Promise(() => undefined));

    renderSearch();

    expect(
      screen.getByRole("status", { name: "Searching archive" }),
    ).toBeTruthy();
    // The filter row is up before the first response: "All filters" is
    // there to press while the facets load.
    expect(screen.getByRole("button", { name: /All filters/ })).toBeTruthy();
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

  it("uses the matching court-case skeleton while that tab loads", () => {
    searchArchiveMock.mockReturnValue(new Promise(() => undefined));

    renderSearch("/search?type=courtcase");

    expect(
      document.querySelectorAll("[data-court-case-card-skeleton]").length,
    ).toBe(12);
  });

  it("keeps filters stable but replaces results during a refresh", async () => {
    const refresh = deferred<ArchiveSearchResponse>();
    searchArchiveMock
      .mockResolvedValueOnce(baseResponse)
      .mockReturnValueOnce(refresh.promise);

    renderSearch();
    await screen.findByText("Original result");

    tick("CIAA: 6 results");

    // The Tags chip names the value in force.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "CIAA" })).toBeTruthy();
    });
    expect(screen.getByRole("group", { name: "Filters" })).toBeTruthy();
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
        .getByRole("tab", { name: "All records" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    // "all" sends no type filter to the API.
    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined }),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Cases" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).toContain(
        "type=case",
      );
    });
    expect(
      screen
        .getByRole("tab", { name: "Cases" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "case" }),
    );
  });

  it("keeps the search bar and the filters in one sticky header", async () => {
    // They are used together — a reader refines the words and the filters in
    // turn — so they pin together under the navbar. A sticky filter sidebar
    // with a search bar that scrolled away split them.
    //
    // jsdom has no layout engine, so this asserts what PRODUCES the layout:
    // the search field and the filter row share one sticky container, and the
    // tabs sit above it rather than inside.
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch();
    await screen.findByText("Original result");

    const search = screen.getByRole("textbox", { name: "Search the Jawafdehi archive" });
    const filterRow = screen.getByRole("group", { name: "Filters" });
    const header = search.closest(".sticky");
    expect(header).toBeTruthy();
    expect(header!.className).toContain("top-[76px]");
    expect(header!.contains(filterRow)).toBe(true);
    expect(header!.contains(screen.getByRole("tablist"))).toBe(false);
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
      screen.getByRole("tab", { name: "Entities" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Entity type")).toBeTruthy();
    });
    openAllFilters();
    expect(
      screen.getByRole("checkbox", { name: "Person: 4 results" }),
    ).toBeTruthy();
    closeAllFilters();

    fireEvent.click(screen.getByRole("tab", { name: "Cases" }));

    await waitFor(() => {
      expect(screen.queryByText("Entity type")).toBeNull();
    });
  });

  it("drops a selected entity type when switching to another record type", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch("/search?type=entity");
    await screen.findByText("Original result");

    tick("Person: 4 results");

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ entity_type: ["Person"], type: "entity" }),
      );
    });

    // Switching record type must not leave the (now hidden) Entity type facet
    // filtering the results behind the user's back.
    fireEvent.click(screen.getByRole("tab", { name: "Cases" }));

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

  it("sends selected court filters and preserves them in the URL", async () => {
    searchArchiveMock.mockResolvedValue(courtFacetResponse);
    renderSearch("/search?type=courtcase");
    await screen.findByText("Court level");

    tick("District Court: 14307 results");

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          court_type: ["district"],
          type: "courtcase",
        }),
      );
    });
    expect(screen.getByTestId("location-search").textContent).toContain(
      "court_type=district",
    );
  });

  it("drops court filters when switching tabs, and keeps location where it applies", async () => {
    // Court level and Court only exist on Court cases. District and Province
    // are SUBJECT geography, which cases and entities carry too, so they travel
    // to those tabs and clear only on the way to one without them.
    searchArchiveMock.mockResolvedValue(courtFacetResponse);
    renderSearch("/search?type=courtcase&court_type=district&province=Bagmati");

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ court_type: ["district"], province: ["Bagmati"], type: "courtcase" }),
      );
    });

    fireEvent.click(screen.getByRole("tab", { name: "Cases" }));

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ court_type: [], province: ["Bagmati"], type: "case" }),
      );
    });
    expect(screen.getByTestId("location-search").textContent).not.toContain("court_type");

    fireEvent.click(screen.getByRole("tab", { name: "Materials" }));

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ province: [], type: "material" }),
      );
    });
    expect(screen.getByTestId("location-search").textContent).not.toContain("province");
  });

  it("ignores a court filter carried in by a non-court URL", async () => {
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch("/search?type=case&court_type=district");
    await screen.findByText("Original result");

    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ court_type: [], type: "case" }),
    );
  });

  // ── बिगो range ───────────────────────────────────────────────────────────────
  //
  // The same three gates as Entity type above, for the same reason: only cases
  // carry an amount, so a bound left in place under another record type empties
  // the results with the control that set it no longer on screen. These run at
  // page level because that is where the gate lives — the unit tests around
  // readBigoBounds cannot see `readParams`, `updateRecordType` or the pill.

  it("drops the बिगो range when switching to another record type", async () => {
    searchArchiveMock.mockResolvedValue(withBigoExtent);
    renderSearch("/search?type=case&bigo_min=10000000");
    await screen.findByText("Original result");

    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ bigo_min: 10_000_000, type: "case" }),
    );

    fireEvent.click(screen.getByRole("tab", { name: "Entities" }));

    await waitFor(() => {
      expect(searchArchiveMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ bigo_min: undefined, type: "entity" }),
      );
    });
    // ...and it leaves the URL, so a shared or bookmarked link stays honest
    // about what is actually applied.
    expect(screen.getByTestId("location-search").textContent).not.toContain(
      "bigo_min",
    );
  });

  it("ignores a बिगो bound carried in by a non-case URL", async () => {
    searchArchiveMock.mockResolvedValue(withBigoExtent);
    renderSearch("/search?type=material&bigo_min=10000000");
    await screen.findByText("Original result");

    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ bigo_min: undefined, type: "material" }),
    );
  });

  it("never sends an inverted बिगो pair, even on the first render", async () => {
    // URL normalization repairs an inverted pair, but only from an effect — a
    // tick AFTER this first request would already have gone out. The API answers
    // min > max with a 400, which this page renders as its red "could not be
    // loaded" alert, so a stale bookmark would read as a search outage.
    searchArchiveMock.mockResolvedValue(withBigoExtent);
    renderSearch("/search?type=case&bigo_min=100000000&bigo_max=10000000");
    await screen.findByText("Original result");

    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ bigo_min: undefined, bigo_max: undefined }),
    );
  });

  it("shows the active बिगो range on the Amount chip, cleared by its ×", async () => {
    searchArchiveMock.mockResolvedValue(withBigoExtent);
    renderSearch("/search?type=case&bigo_min=10000000");
    await screen.findByText("Original result");

    // A range is never applied invisibly: the Amount chip names it, and ONE ×
    // clears it, because it is a single refinement however many bounds it has.
    //
    // Asserted on identity and behaviour, not wording: this suite does not
    // initialise i18next, so `t` hands back the raw default with `{{min}}`
    // uninterpolated. The formatted label is covered where a `t` that
    // interpolates exists — describeBigoRange's unit tests.
    const row = await screen.findByRole("group", { name: "Filters" });
    const amountChip = Array.from(row.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("above"),
    );
    expect(amountChip).toHaveLength(1);

    const clearButton = amountChip[0].nextElementSibling as HTMLButtonElement;
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByTestId("location-search").textContent).not.toContain(
        "bigo_min",
      );
    });
    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ bigo_min: undefined, bigo_max: undefined }),
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

  it("always renders results as cards, with no view toggle", async () => {
    // The card/list switch is gone: cards for cases, entities and court cases,
    // and the document row for materials, which is that record's one format.
    searchArchiveMock.mockResolvedValue(baseResponse);
    renderSearch();
    await screen.findByText("Original result");

    expect(screen.queryByRole("button", { name: "Card view" })).toBeNull();
    expect(screen.queryByRole("button", { name: "List view" })).toBeNull();
    expect(screen.queryByRole("group", { name: "View mode" })).toBeNull();
  });

  it("shows बिगो on case cards, and omits it when there is no amount", async () => {
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

    expect(screen.getByText("Rs 2.49 Crore")).toBeTruthy();
    // A 0/null amount means "no amount recorded", not "nothing was embezzled" —
    // rendering formatBigo(0) as "Rs 0" would assert a finding the case doesn't make.
    expect(screen.queryByText("Rs 0")).toBeNull();
  });

  it("shows every field on a court-case card", async () => {
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
            case_status: "चालु",
            date: "2025-01-10",
            date_bs: "2081-09-26",
          },
        },
      ],
    });

    renderSearch();
    await screen.findByText("Special Court 081-CR-0060");

    // Court cases use the dedicated reusable card.
    const renderedFields = () => ({
      status: screen.getByText("Ongoing").textContent,
      title: screen.getByText("Special Court 081-CR-0060").textContent,
      caseNumber: screen.getByText("081-CR-0060").textContent,
      // Nepali court name and BS date: this suite runs the real i18n, which has
      // not resolved a language here, and `normalizeLanguage` defaults to `ne`
      // to match the app (`lng`/`fallbackLng` are both `ne`, as is the SSR
      // prerender) — so the card takes `date_bs` over `date`, as it should for a
      // Nepali reader. The labels stay English because an unresolved i18next
      // returns each `t()` call's default value. What this assertion is for is
      // that each field appears, which is language-independent either way.
      court: screen.getByText("विशेष अदालत").textContent,
      registered: screen.getByText("Registered: 2081-09-26").textContent,
      cta: screen.getByText("View case").textContent,
    });

    expect(renderedFields()).toEqual({
      status: "Ongoing",
      title: "Special Court 081-CR-0060",
      caseNumber: "081-CR-0060",
      court: "विशेष अदालत",
      registered: "Registered: 2081-09-26",
      cta: "View case",
    });
    expect(
      screen.getByRole("heading", { level: 3, name: "Special Court 081-CR-0060" }).className,
    ).toContain("line-clamp-3");
  });

  it("renders materials as shared document rows, fed only by the index", async () => {
    searchArchiveMock.mockResolvedValue({
      ...baseResponse,
      results: [
        {
          type: "material",
          id: "https://jawafdehi.org/material/ciaa_press_release/1701",
          source_app: "ngm",
          title: { ne: null, en: "Charge sheet filed against nine officials" },
          snippet: { ne: null, en: "Filed at the <em>Special Court</em> today" },
          url: "/material/ciaa_press_release/1701",
          api_url: null,
          matched_fields: ["body"],
          score: 1,
          // The BS-in-AD data-lake quirk: 2082 cannot be an AD document year,
          // so the card must show it resolved (EN locale → the AD pair), not raw.
          extra: { date: "2082-11-27", type: "CreativeWork" },
        },
      ],
    });
    renderSearch("/search?type=material");
    await screen.findByText("Charge sheet filed against nine officials");

    // Materials have one canonical presentation (the /materials series row).
    expect(screen.queryByRole("group", { name: "View mode" })).toBeNull();

    const title = screen.getByRole("link", {
      name: "Charge sheet filed against nine officials",
    });
    expect(title.getAttribute("href")).toBe("/material/ciaa_press_release/1701");
    // Catalogue-style labelled rows. Series is the curated registry name (not
    // the raw token or a schema.org class); Source is the publishing office, a
    // separate axis; Date resolves the BS-in-AD quirk to the AD pair for EN.
    expect(metaValue("Series")).toBe("CIAA press releases");
    expect(metaValue("Date")).toBe("2026-03-11");
    // Office names live in the i18n catalogue, which no instance loads here,
    // so the value degrades to the raw source token.
    expect(metaValue("Source")).toBe("ciaa_press_release");
    // The API pre-marks the snippet's matches with <em>; those render as
    // highlights, so the text is split across nodes rather than one string.
    const snippetMark = document.querySelector("p > mark");
    expect(snippetMark?.textContent).toBe("Special Court");
    expect(snippetMark?.parentElement?.textContent).toBe(
      "Filed at the Special Court today",
    );

    // No download/source buttons and NO detail fetch: the index carries no
    // media, and hydrating it would cost a GET per hit on a 346k-record browse
    // surface. Share is the only action; the downloads live on the document.
    // No i18n instance in this suite and ShareButton's aria-label has no
    // fallback, so its accessible name is the raw catalogue key.
    expect(screen.getByRole("button", { name: "share.share" })).toBeTruthy();
    expect(screen.queryByText(/^\.[A-Z]+$/)).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Open original source" }),
    ).toBeNull();
    expect(getMaterialMock).not.toHaveBeenCalled();
  });

  it("names a series for a material outside the curated registry", async () => {
    searchArchiveMock.mockResolvedValue({
      ...baseResponse,
      results: [
        {
          type: "material",
          id: "https://jawafdehi.org/material/court_order/special.081-cr-0111",
          source_app: "ngm",
          title: { ne: null, en: "Special Court verdict 081-CR-0111" },
          snippet: { ne: null, en: null },
          url: "/material/court_order/special.081-cr-0111",
          api_url: null,
          matched_fields: [],
          score: 1,
          extra: { date: "2025-12-29", type: "Manuscript,DigitalDocument" },
        },
      ],
    });

    renderSearch("/search?type=material");
    await screen.findByText("Special Court verdict 081-CR-0111");

    // `court_order` is not in the curated registry, so its series name comes
    // from the source's document type instead. Every material gets one.
    //
    // The type's display string lives in the i18n catalogue ("Court orders"),
    // which no instance loads here, so it degrades to the plain-read token.
    expect(metaValue("Series")).toBe("court order");
    expect(metaValue("Source")).toBe("court_order");
    expect(metaValue("Date")).toBe("2025-12-29");
  });

  it("highlights the query in a material title and its series row", async () => {
    searchArchiveMock.mockResolvedValue({
      ...baseResponse,
      results: [
        {
          type: "material",
          id: "https://jawafdehi.org/material/court_order/special.081-cr-0111",
          source_app: "ngm",
          title: { ne: null, en: "Special Court verdict on the order" },
          snippet: { ne: null, en: null },
          url: "/material/court_order/special.081-cr-0111",
          api_url: null,
          matched_fields: ["title_en"],
          score: 1,
          extra: { date: "2025-12-29", type: "Manuscript,DigitalDocument" },
        },
      ],
    });

    renderSearch("/search?type=material&q=order");
    await screen.findByRole("link", {
      name: "Special Court verdict on the order",
    });

    // The API leaves `title` unmarked, so the query's terms are matched here —
    // in the title and in the labelled rows alike. Asserted per field rather
    // than as a document-wide count, since which rows contain the term depends
    // on the catalogue copy.
    const title = screen.getByRole("link", {
      name: "Special Court verdict on the order",
    });
    expect(title.querySelector("mark")?.textContent).toBe("order");
    const seriesRow = screen.getByText("Series:").parentElement;
    expect(seriesRow?.querySelector("mark")?.textContent).toBe("order");
    // Highlighting must not change what the fields say. The title keeps its
    // accessible name (asserted by the getByRole above) and the row its value.
    expect(metaValue("Series")).toBe("court order");
    // A term shorter than two characters would speckle Devanagari with marks.
    expect(document.querySelectorAll("mark").length).toBeGreaterThan(0);
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

    tick("CIAA: 6 results");

    expect(
      await screen.findByText("Archive search could not be loaded."),
    ).toBeTruthy();
    expect(screen.getByRole("group", { name: "Filters" })).toBeTruthy();
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
  describe("All filters sheet", () => {
    it("keeps the full panel closed until asked for, and renders it once", async () => {
      searchArchiveMock.mockResolvedValue(baseResponse);
      renderSearch();
      await screen.findByText("Original result");

      // Closed: the chips carry the filters; the full panel is not in the DOM.
      expect(
        document.querySelectorAll('aside[aria-label="Archive search filters"]').length,
      ).toBe(0);
      expect(screen.getAllByRole("tab").length).toBe(5);

      const sheet = openAllFilters();
      expect(
        document.querySelectorAll('aside[aria-label="Archive search filters"]').length,
      ).toBe(1);
      expect(within(sheet).getAllByRole("checkbox").length).toBe(2);
    });

    it("Clear all keeps the tab, clears the filters, and closes the sheet", async () => {
      // Regression: clearing on the Cases tab used to drop `type` as well, so
      // the reader was thrown back to All records.
      searchArchiveMock.mockResolvedValue(baseResponse);
      renderSearch("/search?type=case&province=Bagmati&tags=procurement");
      await screen.findByText("Original result");

      const sheet = openAllFilters();
      fireEvent.click(within(sheet).getByRole("button", { name: "Clear all" }));

      await waitFor(() => {
        expect(screen.getByTestId("location-search").textContent).toBe("?type=case");
      });
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("disables Clear all while nothing is applied", async () => {
      searchArchiveMock.mockResolvedValue(baseResponse);
      renderSearch("/search?type=case");
      await screen.findByText("Original result");

      const sheet = openAllFilters();
      expect(
        within(sheet).getByRole("button", { name: "Clear all" }).hasAttribute("disabled"),
      ).toBe(true);
    });

    it("counts the filters in force on its button", async () => {
      searchArchiveMock.mockResolvedValue(baseResponse);
      renderSearch();
      await screen.findByText("Original result");

      tick("CIAA: 6 results");
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /All filters\s*1/ })).toBeTruthy();
      });
    });
  });
});

// The materials tab's two controls — document type and a date range — end to
// end: URL in, request out, pill on screen, and back out again.
//
// Both are MATERIAL-SCOPED, and for a sharper reason than the court facets are:
// `material_type` is a closed vocabulary on the API side, so a token carried
// onto another tab is a 400, which this page renders as the red "could not be
// loaded" alert. The gating is what keeps a stale bookmark from reading as an
// outage.
describe("ArchiveSearch — materials tab filters", () => {
  beforeEach(() => {
    searchArchiveMock.mockReset();
    getMaterialMock.mockReset();
    searchArchiveMock.mockResolvedValue({
      ...baseResponse,
      counts: { material: 3 },
      facets: {
        ...baseResponse.facets,
        material_type: [
          { name: "procurement_notice", count: 205_826 },
          { name: "charge_sheet", count: 99_783 },
        ],
      },
    });
  });

  const lastRequest = () =>
    searchArchiveMock.mock.calls[searchArchiveMock.mock.calls.length - 1][0];

  it("sends both filters when the materials tab carries them", async () => {
    renderSearch(
      "/search?type=material&material_type=charge_sheet&date_from=2020-01-01&date_to=2024-12-31",
    );
    await waitFor(() => expect(searchArchiveMock).toHaveBeenCalled());
    expect(lastRequest()).toMatchObject({
      type: "material",
      material_type: ["charge_sheet"],
      date_from: "2020-01-01",
      date_to: "2024-12-31",
    });
  });

  it("repeats material_type for a reader who ticks two boxes", async () => {
    renderSearch(
      "/search?type=material&material_type=charge_sheet&material_type=press_release",
    );
    await waitFor(() => expect(searchArchiveMock).toHaveBeenCalled());
    expect(lastRequest().material_type).toEqual([
      "charge_sheet",
      "press_release",
    ]);
  });

  it("refuses to send a stale material_type from another tab", async () => {
    // The 400 path. A hand-edited or bookmarked URL can carry the token
    // anywhere; sending it on ?type=case would surface as a search outage.
    renderSearch("/search?type=case&material_type=charge_sheet");
    await waitFor(() => expect(searchArchiveMock).toHaveBeenCalled());
    expect(lastRequest().material_type).toEqual([]);
  });

  it("refuses to send stale date bounds from another tab", async () => {
    renderSearch("/search?type=entity&date_from=2020-01-01&date_to=2024-12-31");
    await waitFor(() => expect(searchArchiveMock).toHaveBeenCalled());
    expect(lastRequest().date_from).toBeUndefined();
    expect(lastRequest().date_to).toBeUndefined();
  });

  it("never sends an inverted date pair, not even on the first render", async () => {
    // Normalization only rewrites the URL an effect LATER, so a request builder
    // doing its own parsing would fire the 400 before the URL healed itself.
    // Both halves have to drop at read time.
    renderSearch("/search?type=material&date_from=2024-12-31&date_to=2020-01-01");
    await waitFor(() => expect(searchArchiveMock).toHaveBeenCalled());
    expect(searchArchiveMock.mock.calls[0][0].date_from).toBeUndefined();
    expect(searchArchiveMock.mock.calls[0][0].date_to).toBeUndefined();
  });

  it("shows the date range on its chip, and its × clears both bounds", async () => {
    renderSearch("/search?type=material&date_from=2020-01-01&date_to=2024-12-31");
    await waitFor(() => expect(searchArchiveMock).toHaveBeenCalled());

    // One chip value rather than one per bound, because it is a single
    // refinement — same call as the बिगो range above.
    //
    // Asserted on identity and behaviour, not wording: this suite does not
    // initialise i18next, so `t` hands back the raw default with `{{from}}`
    // uninterpolated. The formatted label is covered where a `t` that
    // interpolates exists — describeDateRange's unit tests.
    const row = await screen.findByRole("group", { name: "Filters" });
    const dateChip = Array.from(row.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("{{from}}"),
    );
    expect(dateChip).toHaveLength(1);

    fireEvent.click(dateChip[0].nextElementSibling as HTMLButtonElement);

    await waitFor(() => {
      const search = screen.getByTestId("location-search").textContent ?? "";
      expect(search).not.toContain("date_from");
      expect(search).not.toContain("date_to");
    });
    expect(searchArchiveMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ date_from: undefined, date_to: undefined }),
    );
  });

  it("strips both filters from the URL when the reader leaves the tab", async () => {
    // readParams already declines to SEND them, but leaving them in the URL
    // makes a shared or bookmarked link claim a filter that is not applied.
    renderSearch(
      "/search?type=material&material_type=charge_sheet&date_from=2020-01-01",
    );
    await waitFor(() => expect(searchArchiveMock).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("tab", { name: "Cases" }));
    await waitFor(() => {
      const search = screen.getByTestId("location-search").textContent ?? "";
      expect(search).toContain("type=case");
      expect(search).not.toContain("material_type");
      expect(search).not.toContain("date_from");
    });
  });
});
