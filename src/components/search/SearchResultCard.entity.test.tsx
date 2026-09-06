import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { SearchResultCard } from "@/components/search/SearchResultCard";
import type { ArchiveSearchResult } from "@/types/search";

// Passthrough translations: a string second argument is a literal fallback, so
// it wins; anything else leaves the key visible for assertions.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === "string" ? fallback : key),
  }),
}));

const hit = (over: Partial<ArchiveSearchResult> = {}): ArchiveSearchResult => ({
  type: "entity",
  id: "https://jawafdehi.org/entity/person/ram-dev-ram-230508",
  source_app: "nes",
  title: { en: "Ram Dev Ram", ne: "राम देव राम" },
  snippet: { en: "<em>Ram</em> Dev Ram", ne: null },
  score: 1,
  url: "/entity/person/ram-dev-ram-230508",
  api_url: null,
  matched_fields: ["name"],
  extra: { type: "Person" },
  ...over,
});

const renderHit = (result: ArchiveSearchResult, viewMode: "list" | "card" = "card") =>
  render(
    <MemoryRouter>
      <SearchResultCard result={result} viewMode={viewMode} />
    </MemoryRouter>,
  );

// Every place-kind entity in the index — `Place`, `AdministrativeArea`,
// `AdministrativeArea,jawafdehi:District` — carries a real bilingual name, not
// an IRI. A `kind !== "location"` guard here therefore dropped the Nepali
// spelling from roughly one in eight entity results, on a site whose default
// language is Nepali. (The IRI-titled documents the guard was written for are
// the legacy lowercase `extra.type === "location"` ones, which formatSimpleTitle
// already unwraps; none remain in the live index as of 2026-09-06.)
describe("entity search hits keep both scripts", () => {
  it.each([
    ["a district", "AdministrativeArea,jawafdehi:District", "Banke", "बाँके"],
    ["a province", "AdministrativeArea", "Nepal", "नेपाल"],
    ["a place", "Place", "Kalikot", "कालिकोट"],
    ["a person", "Person", "Ram Dev Ram", "राम देव राम"],
    ["an organisation", "Organization,Corporation", "Machhapuchhre Bank Limited", "माछापुच्छ्रे बैंक लिमिटेड"],
  ])("shows the Nepali spelling for %s", (_label, type, en, ne) => {
    renderHit(hit({ title: { en, ne }, extra: { type } }));

    expect(screen.getByRole("link").textContent).toContain(en);
    expect(screen.getByText(ne)).toBeDefined();
  });

  it("omits the second line when the record carries only one script", () => {
    const { container } = renderHit(hit({ title: { en: "Munich, Germany", ne: null } }));

    expect(container.textContent).toContain("Munich, Germany");
    // Name, then the kind caption — nothing in between.
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("does not repeat the name when both scripts hold the same string", () => {
    const name = "Thakral One Nepal Pvt. Ltd.";
    const { container } = renderHit(hit({ title: { en: name, ne: name } }));

    expect(container.textContent?.match(/Thakral One Nepal/g)).toHaveLength(1);
  });
});

describe("entity search hits describe their kind", () => {
  it("localises the three generic kinds", () => {
    renderHit(hit({ extra: { type: "Person" } }));
    expect(screen.getByText(/entityDetail\.person/)).toBeDefined();
  });

  it("keeps a specific subtype in the index's own wording", () => {
    renderHit(hit({ title: { en: "Banke", ne: "बाँके" }, extra: { type: "AdministrativeArea,jawafdehi:District" } }));
    expect(screen.getByText(/District/)).toBeDefined();
  });

  // The pill duplicated the caption and the footer duplicated the card-wide
  // link; both went when the whole tile became the link.
  it("drops the type pill and the View footer", () => {
    const { container } = renderHit(hit());

    expect(container.textContent).not.toContain("Entity ·");
    expect(screen.queryByText("View")).toBeNull();
  });

  // The entity snippet is the title echoed back with <em> marks around the
  // match, so rendering it printed the name twice.
  it("does not render the highlight snippet as a description", () => {
    const { container } = renderHit(hit());

    expect(container.innerHTML).not.toContain("<em>");
    expect(container.textContent?.match(/Ram Dev Ram/g)).toHaveLength(1);
  });
});
