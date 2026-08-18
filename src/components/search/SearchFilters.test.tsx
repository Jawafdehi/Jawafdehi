import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

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

const emptyFacets = {
  entity_type: [],
  case_type: [],
  tags: [],
  status: [],
};

// The real published corpus, per JawafdehiAPI#450.
const CORPUS: BigoExtent = { min: 45_220, max: 66_000_000_000, count: 68 };

function renderFilters(
  selectedType: ArchiveSearchType,
  extra: {
    extent?: BigoExtent;
    min?: number;
    max?: number;
    onCommit?: () => void;
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
  it("renders a two-thumb slider while browsing Cases", () => {
    renderFilters("case");
    expect(within(bigoGroup()).getAllByRole("slider")).toHaveLength(2);
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

  it("reads out the active range, and 'Any amount' when unbounded", () => {
    // The thumbs carry ladder indices, which are meaningless on their own — the
    // amounts have to be on screen or the control says nothing.
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

  it("states how many cases record an amount at all", () => {
    // ~9% record none, and a range clause cannot match an absent field, so
    // without this their disappearance reads as "there are no such cases".
    renderFilters("case");
    expect(
      within(bigoGroup()).getByText(
        "Filtering by amount includes only the 68 cases with a recorded बिगो.",
      ),
    ).toBeTruthy();
  });

  it("renders no control at all when the corpus has no rails", () => {
    // An older cached response predating the extent agg, or a corpus where
    // nothing records an amount. A slider with no scale would be pinned shut.
    renderFilters("case", { extent: undefined });
    expect(screen.queryByRole("group", { name: /बिगो/ })).toBeNull();
  });
});
