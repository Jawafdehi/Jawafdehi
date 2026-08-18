import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { SearchFilters } from "@/components/search/SearchFilters";
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

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === "string") return fallback;
      const template = String(fallback?.defaultValue ?? key);
      return template.replace(/{{(\w+)}}/g, (_m, name) =>
        String((fallback as Record<string, unknown>)?.[name]),
      );
    },
    i18n: { language: "en" },
  }),
}));

const emptyFacets = { entity_type: [], case_type: [], tags: [], status: [] };

// Mirrors what the API emits: fine stops for the thumbs, coarse decade bars.
const CORPUS: BigoExtent = {
  min: 45_220,
  max: 66_000_000_000,
  count: 68,
  stops: Array.from({ length: 13 }, (_, exponent) =>
    [1, 2, 5].map((mantissa) => mantissa * 10 ** exponent),
  ).flat(),
  buckets: Array.from({ length: 14 }, (_, index) => ({
    from: index === 0 ? null : 10 ** (index - 1),
    to: index === 13 ? null : 10 ** index,
    count: index,
  })),
};

function renderFilters(
  selectedType: ArchiveSearchType,
  extra: {
    extent?: BigoExtent;
    min?: number;
    max?: number;
    matchCount?: number;
    onCommit?: (bounds: { min?: number; max?: number }) => void;
  } = {},
) {
  return render(
    <SearchFilters
      bigoExtent={"extent" in extra ? extra.extent : CORPUS}
      bigoMatchCount={extra.matchCount}
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
  it("renders the histogram, both thumbs and both amount fields", () => {
    // The three layers each answer a documented failure of numeric filters:
    // no distribution shown, no precise entry, no accessible alternative to
    // press-and-drag.
    renderFilters("case");
    const group = bigoGroup();
    expect(within(group).getByTestId("bigo-histogram")).toBeTruthy();
    expect(within(group).getAllByRole("slider")).toHaveLength(2);
    expect(within(group).getByLabelText("Min (Rs)")).toBeTruthy();
    expect(within(group).getByLabelText("Max (Rs)")).toBeTruthy();
  });

  it("draws one bar per server bucket, and keeps out-of-range bars visible", () => {
    // Dimmed, not removed: the shape is what tells a reader where to drag next,
    // so erasing it the moment they narrow removes the guidance when it is most
    // needed. Bars are the server's buckets — the client invents no ladder.
    renderFilters("case", { min: 10_000_000 });
    const bars = within(bigoGroup()).getByTestId("bigo-histogram").children;
    expect(bars).toHaveLength(CORPUS.buckets.length);
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

  it("renders no control at all when the corpus has no usable rails", () => {
    // An older cached response predating the extent agg, or a corpus where
    // nothing records an amount. A slider with no scale would be pinned shut.
    renderFilters("case", { extent: undefined });
    expect(screen.queryByRole("group", { name: /बिगो/ })).toBeNull();
  });

  it("reads out the active range, and 'Any amount' when unbounded", () => {
    const { unmount } = renderFilters("case", {
      min: 10_000_000,
      max: 5_000_000_000,
    });
    expect(
      within(bigoGroup()).getByText("Rs 1.00 Crore – Rs 5.00 Arab"),
    ).toBeTruthy();
    unmount();

    renderFilters("case");
    expect(within(bigoGroup()).getByText("Any amount")).toBeTruthy();
  });

  it("announces amounts on the thumbs, not ladder indices", () => {
    // aria-valuenow is necessarily the index; without valuetext a screen reader
    // would read "7 of 20", which tells the listener nothing about money.
    renderFilters("case", { min: 10_000_000 });
    const [low, high] = within(bigoGroup()).getAllByRole("slider");
    expect(low.getAttribute("aria-label")).toBe("Minimum amount");
    expect(low.getAttribute("aria-valuetext")).toBe("Rs 1.00 Crore");
    expect(high.getAttribute("aria-valuetext")).toBe("No maximum");
  });

  it("commits a typed amount on Enter", () => {
    // Baymard's requirement that a filtering slider always carry text inputs —
    // and the path that works for anyone who cannot drag accurately at all.
    const onCommit = vi.fn();
    renderFilters("case", { onCommit });
    const field = within(bigoGroup()).getByLabelText("Min (Rs)");
    fireEvent.change(field, { target: { value: "25000000" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith({ min: 25_000_000, max: undefined });
  });

  it("groups digits as you type, without mangling the committed value", () => {
    renderFilters("case");
    const field = within(bigoGroup()).getByLabelText("Min (Rs)") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "25000000" } });
    expect(field.value).toBe("2,50,00,000");
  });

  it("clears a bound when its field is emptied", () => {
    const onCommit = vi.fn();
    renderFilters("case", { min: 10_000_000, onCommit });
    const field = within(bigoGroup()).getByLabelText("Min (Rs)");
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledWith({ min: undefined, max: undefined });
  });

  it("drops the opposing bound rather than committing an inverted pair", () => {
    // Mid-thought, not an error worth shouting about — and the API answers an
    // inverted pair with a 400, which renders as "could not be loaded".
    const onCommit = vi.fn();
    renderFilters("case", { max: 10_000_000, onCommit });
    const field = within(bigoGroup()).getByLabelText("Min (Rs)");
    fireEvent.change(field, { target: { value: "500000000" } });
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenCalledWith({ min: 500_000_000 });
  });

  it("offers the one-tap preset for the query most readers actually make", () => {
    // 59 of the 68 cases with a recorded amount clear रु १ करोड.
    const onCommit = vi.fn();
    renderFilters("case", { onCommit });
    fireEvent.click(within(bigoGroup()).getByRole("button", { name: /Over/ }));
    expect(onCommit).toHaveBeenCalledWith({ min: 10_000_000 });
  });

  it("says what the filter will give, and what it can reach when unfiltered", () => {
    // ~9% of cases record no amount and are excluded by ANY bound, since a range
    // clause cannot match an absent field.
    const { unmount } = renderFilters("case");
    expect(
      within(bigoGroup()).getByText(
        "Filtering by amount includes only the 68 cases with a recorded बिगो.",
      ),
    ).toBeTruthy();
    unmount();

    renderFilters("case", { min: 10_000_000, matchCount: 59 });
    expect(within(bigoGroup()).getByText("59 cases in this range.")).toBeTruthy();
  });
});
