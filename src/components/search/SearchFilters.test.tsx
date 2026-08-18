import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { SearchFilters } from "@/components/search/SearchFilters";
import type { ArchiveSearchType } from "@/types/search";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === "string" ? fallback : fallback?.defaultValue ?? key,
    i18n: { language: "en" },
  }),
}));

const emptyFacets = {
  entity_type: [],
  case_type: [],
  tags: [],
  status: [],
};

function renderFilters(selectedType: ArchiveSearchType, selectedBand?: string) {
  return render(
    <SearchFilters
      counts={{}}
      facets={emptyFacets}
      onBigoBandChange={vi.fn()}
      onClear={vi.fn()}
      onToggle={vi.fn()}
      onTypeChange={vi.fn()}
      selected={{ entity_type: [], case_type: [], tags: [] }}
      selectedBigoBand={selectedBand}
      selectedType={selectedType}
    />,
  );
}

describe("SearchFilters — बिगो band group", () => {
  it("renders while browsing Cases", () => {
    renderFilters("case", "any");
    expect(screen.getByText("बिगो (amount)")).toBeTruthy();
    expect(screen.getByLabelText("Rs 1–10 Crore")).toBeTruthy();
  });

  it("says that cases with no recorded amount are excluded", () => {
    // ~9% of published cases record no amount. A range clause cannot match an
    // absent field, so without this note their disappearance reads as
    // "there are no such cases".
    renderFilters("case", "any");
    expect(
      screen.getByText("Includes only cases with a recorded amount."),
    ).toBeTruthy();
  });

  it("is hidden for every other record type, and for All records", () => {
    // Only cases carry an amount, so a bound applied anywhere else empties the
    // results with no visible cause — the same failure "Entity type" had.
    (["all", "entity", "material", "courtcase"] as const).forEach((type) => {
      const { unmount } = renderFilters(type);
      expect(screen.queryByText("बिगो (amount)")).toBeNull();
      unmount();
    });
  });

  it("checks the band in force, and none for a range matching no preset", () => {
    // ArchiveSearch passes `undefined` for a hand-edited range. No radio may
    // claim to be the one in force; the pill above the results carries it.
    const checkedLabels = (band?: string) => {
      const { unmount } = renderFilters("case", band);
      // Scoped to the बिगो fieldset — the record-type group is also a radio
      // group, and while browsing Cases it has a checked option of its own.
      const checked = within(screen.getByRole("group", { name: "बिगो (amount)" }))
        .getAllByRole("radio")
        .filter((radio) => radio.getAttribute("aria-checked") === "true")
        .map((radio) => radio.getAttribute("aria-label"));
      unmount();
      return checked;
    };

    expect(checkedLabels("1-to-10-crore")).toEqual(["Rs 1–10 Crore"]);
    expect(checkedLabels(undefined)).toEqual([]);
  });
});
