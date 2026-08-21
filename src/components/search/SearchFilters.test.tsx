import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import {
  SearchFilters,
  SearchFiltersSkeleton,
} from "@/components/search/SearchFilters";
import type { BigoExtent } from "@/lib/bigo-range";
import type { ArchiveSearchType } from "@/types/search";

// Radix's Slider measures its thumbs through ResizeObserver, which jsdom does
// not implement. There is no global vitest setup file in this repo, so the shim
// is local: a no-op is enough, since these assertions are about roles, labels
// and text rather than geometry.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Passthrough translations so assertions don't depend on i18n resources. Plural
// resolution is mirrored rather than skipped: `_one` vs `_other` is the whole
// point of the count-bearing strings, so a mock that always took defaultValue
// would let "1 cases" pass forever.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === "string") return fallback;
      const options = fallback as Record<string, unknown> | undefined;
      const singular = options?.count === 1 ? options?.defaultValue_one : undefined;
      const template = String(singular ?? options?.defaultValue ?? key);
      return template.replace(/{{(\w+)}}/g, (_m, name) =>
        String(options?.[name]),
      );
    },
    i18n: { language: "en" },
  }),
}));

const emptyFacets = { entity_type: [], case_type: [], tags: [], status: [] };

// The live corpus extent, as the API emits it.
const CORPUS: BigoExtent = { min: 45_220, max: 66_000_000_000, count: 75 };

function renderFilters(
  selectedType: ArchiveSearchType,
  extra: {
    extent?: BigoExtent;
    min?: number;
    max?: number;
    onCommit?: (bounds: { min?: number; max?: number }) => void;
  } = {},
) {
  return render(
    <SearchFilters
      bigoExtent={"extent" in extra ? extra.extent : CORPUS}
      bigoMax={extra.max}
      bigoMin={extra.min}
      counts={{}}
      facets={emptyFacets}
      onBigoCommit={extra.onCommit ?? vi.fn()}
      onClear={vi.fn()}
      onToggle={vi.fn()}
      onTypeChange={vi.fn()}
      selected={{ entity_type: [], case_type: [], tags: [] }}
      selectedType={selectedType}
    />,
  );
}

const bigoGroup = () => screen.getByRole("group", { name: /बिगो/ });

describe("SearchFilters — बिगो range control", () => {
  it("renders a two-thumb range slider and both amount fields", () => {
    renderFilters("case");
    const group = bigoGroup();
    expect(within(group).getAllByRole("slider")).toHaveLength(2);
    expect(within(group).getByLabelText("Min (Rs)")).toBeTruthy();
    expect(within(group).getByLabelText("Max (Rs)")).toBeTruthy();
  });

  it("stays under five blocks — this shares a column with four other groups", () => {
    // The panel reached nine blocks once (readout, chart, axis, three lines of
    // help text, two fields, a preset, a count) and read as the heaviest thing in
    // the sidebar. Track, axis, fields and one status line is the budget.
    renderFilters("case");
    expect(bigoGroup().children.length).toBeLessThanOrEqual(5);
  });

  it("carries no instructional copy", () => {
    // A control that needs explaining is the wrong control. A range slider with
    // text inputs beneath it is the pattern every price filter uses.
    renderFilters("case");
    expect(within(bigoGroup()).queryByText(/Shift/i)).toBeNull();
    expect(within(bigoGroup()).queryByText(/Select a bar/i)).toBeNull();
    expect(within(bigoGroup()).queryByTestId("bigo-histogram")).toBeNull();
  });

  it("names each thumb, and spells the amount out for a screen reader", () => {
    // aria-valuenow is necessarily a ladder INDEX; "7 of 20" tells a listener
    // nothing about money, so each thumb carries the formatted amount instead.
    renderFilters("case", { min: 10_000_000 });
    const [low, high] = within(bigoGroup()).getAllByRole("slider");
    expect(low.getAttribute("aria-label")).toBe("Minimum amount");
    expect(low.getAttribute("aria-valuetext")).toBe("Rs 1.00 Crore");
    expect(high.getAttribute("aria-label")).toBe("Maximum amount");
    // No upper bound set, so that thumb sits on the bracketing edge.
    expect(high.getAttribute("aria-valuetext")).toBe("No maximum");
  });

  it("announces a bound that snaps to a ladder END, rather than 'No minimum'", () => {
    // Regression. aria-valuetext was derived from the thumb's ladder POSITION,
    // and `indexToBound` returns undefined at either end because an end-parked
    // thumb means "no bound". But a literal bound can snap to an end and still
    // be in force: the live ladder floor is रु 20,000, so ?bigo_min=25000 lands
    // the thumb on index 0 while the filter, the URL and the pill all carry
    // रु 25,000. A screen reader was told "No minimum" about an applied minimum.
    //
    // The position is a rendering detail; the announcement is a claim about the
    // filter, so at rest it reports the COMMITTED bound.
    renderFilters("case", { min: 25_000 });
    const [low] = within(bigoGroup()).getAllByRole("slider");
    expect(low.getAttribute("aria-valuetext")).toBe("Rs 25,000");
  });

  it("announces an upper bound snapped to the ladder ceiling", () => {
    // The same failure on the other end: the ladder tops out at रु 1.00 Kharab,
    // so anything from ~रु 75 अरब up parks the thumb on the last index.
    renderFilters("case", { max: 80_000_000_000 });
    const [, high] = within(bigoGroup()).getAllByRole("slider");
    expect(high.getAttribute("aria-valuetext")).toBe("Rs 80.00 Arab");
  });

  it("still says 'No minimum'/'No maximum' when a side genuinely has no bound", () => {
    renderFilters("case");
    const [low, high] = within(bigoGroup()).getAllByRole("slider");
    expect(low.getAttribute("aria-valuetext")).toBe("No minimum");
    expect(high.getAttribute("aria-valuetext")).toBe("No maximum");
  });

  it("sits directly under Record type, above the term facets", () => {
    // It used to render last. The tags group runs to 50 checkboxes, so anything
    // after it is off-screen on every viewport.
    render(
      <SearchFilters
        bigoExtent={CORPUS}
        bigoMax={undefined}
        bigoMin={undefined}
        counts={{}}
        facets={{
          ...emptyFacets,
          case_type: [{ name: "CORRUPTION", count: 9 }],
          tags: [{ name: "CIAA", count: 4 }],
        }}
        onBigoCommit={vi.fn()}
        onClear={vi.fn()}
        onToggle={vi.fn()}
        onTypeChange={vi.fn()}
        selected={{ entity_type: [], case_type: [], tags: [] }}
        selectedType="case"
      />,
    );
    const legends = Array.from(document.querySelectorAll("legend")).map(
      (legend) => legend.textContent,
    );
    expect(legends).toEqual([
      "Record type",
      "बिगो (amount)",
      "Case type",
      "Tags",
    ]);
  });

  it("is hidden for every other record type, and for All records", () => {
    // Only cases carry an amount, so a bound applied anywhere else empties the
    // results with no visible cause — the same failure "Entity type" had.
    (["all", "entity", "material", "courtcase"] as const).forEach((type) => {
      const { unmount } = renderFilters(type);
      expect(screen.queryByRole("group", { name: /बिगो/ })).toBeNull();
      unmount();
    });
  });

  it("renders no control at all when the corpus has no usable extent", () => {
    // An older cached response predating the extent agg, or a corpus where
    // nothing records an amount. An empty track above two fields is furniture.
    renderFilters("case", { extent: undefined });
    expect(screen.queryByRole("group", { name: /बिगो/ })).toBeNull();
  });

  it("commits a typed minimum on blur", () => {
    const onCommit = vi.fn();
    renderFilters("case", { onCommit });
    const field = within(bigoGroup()).getByLabelText("Min (Rs)");
    fireEvent.change(field, { target: { value: "10000000" } });
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledWith({ min: 10_000_000, max: undefined });
  });

  it("drops the other side rather than sending an inverted pair", () => {
    // The API 400s on bigo_min > bigo_max, and this page renders a 400 as its
    // red "could not be loaded" alert — an outage, for a typo.
    const onCommit = vi.fn();
    renderFilters("case", { max: 1_000_000, onCommit });
    const field = within(bigoGroup()).getByLabelText("Min (Rs)");
    fireEvent.change(field, { target: { value: "90000000" } });
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledWith({ min: 90_000_000 });
  });

  it("shows no range readout — the pill and the fields already carry it", () => {
    // A "<range> · N cases" line used to sit at the bottom. It restated what the
    // removable pill, the two fields and the result header all already said, in
    // a column shared with four other filter groups.
    renderFilters("case", { min: 10_000_000 });
    expect(within(bigoGroup()).queryByText(/cases$/)).toBeNull();
    expect(within(bigoGroup()).queryByText(/Rs 1\.00 Crore and above/)).toBeNull();
  });

  it("drops the coverage caveat once a bound is set", () => {
    renderFilters("case", { min: 10_000_000 });
    expect(within(bigoGroup()).queryByText(/recorded बिगो/)).toBeNull();
  });

  it("says what the filter can reach at all when unfiltered", () => {
    // ~9% of cases record no amount and are excluded by ANY bound, since a range
    // clause cannot match an absent field. With no distribution on screen, this
    // line is the only warning before a reader narrows into an empty page.
    renderFilters("case");
    expect(
      within(bigoGroup()).getByText(
        "Filtering by amount includes only the 75 cases with a recorded बिगो.",
      ),
    ).toBeTruthy();
  });
});

describe("SearchFiltersSkeleton", () => {
  it("reserves the बिगो block in the slot the real control occupies", () => {
    // Untested until now, and it renders on every cold load of /search. The
    // बिगो control is second and tall (chart + two fields + a button), so a
    // skeleton that omits it drops every facet below it down the page the
    // moment the real sidebar lands — a jump that is now above the fold.
    const { container } = render(<SearchFiltersSkeleton selectedType="case" />);
    const aside = container.querySelector("aside");
    expect(aside).toBeTruthy();

    // header + record-type group + बिगो block + three facet groups.
    const blocks = Array.from(aside!.children);
    expect(blocks).toHaveLength(6);

    // The बिगो placeholder is the one carrying the histogram-height bar.
    expect(blocks[2].querySelector(".h-14")).toBeTruthy();
    // ...and the facet groups around it do not.
    expect(blocks[1].querySelector(".h-14")).toBeNull();
    expect(blocks[3].querySelector(".h-14")).toBeNull();
  });

  it("omits the बिगो block for every record type that cannot show it", () => {
    // Regression, and the mirror image of the test above. The real control is
    // gated to `selectedType === "case"`, but the skeleton reserved its ~296px
    // unconditionally — so the DEFAULT /search (type=all), /materials and
    // /court-cases all painted a block that then vanished on first paint,
    // dragging every facet below it upward. The old justification ("no way to
    // know whether the case index is in scope") was wrong: the type is read
    // synchronously off the URL, well before the first response.
    for (const type of ["all", "entity", "material", "courtcase"] as const) {
      const { container, unmount } = render(
        <SearchFiltersSkeleton selectedType={type} />,
      );
      const blocks = Array.from(container.querySelector("aside")!.children);
      expect(blocks).toHaveLength(5);
      expect(container.querySelector(".h-14")).toBeNull();
      unmount();
    }
  });
});
