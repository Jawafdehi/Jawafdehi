import { describe, expect, it } from "vitest";

import {
  caseCardPropsFromCaseDetail,
  caseCardPropsFromSearchResult,
} from "@/lib/case-card-props";
import type { ArchiveSearchResult, CaseSearchCard } from "@/types/search";
import type { CaseDetail } from "@/types/jds";

function searchResult(card?: Partial<CaseSearchCard>): ArchiveSearchResult {
  return {
    type: "case",
    id: "case-1",
    source_app: "jawafdehi",
    title: { en: "Indexed <em>title</em>", ne: "" },
    snippet: { en: "", ne: "" },
    score: 1,
    url: "https://jawafdehi.org/case/giribandhu-tea-estate",
    api_url: null,
    matched_fields: [],
    extra: {},
    card: card
      ? ({
          slug: "giribandhu-tea-estate",
          title: "Giribandhu Tea Estate Land Swap Scandal",
          short_description: null,
          key_allegations: [],
          tags: ["Land Grab"],
          case_type: null,
          status: "ongoing",
          case_start_date: null,
          case_end_date: null,
          bigo: 9_000_000,
          thumbnail: null,
          thumbnail_url: null,
          banner_url: null,
          timeline: [],
          entities: [
            { nes_id: "nes:1", display_name: "Deepak Malhotra", entity_type: null, type: "accused" },
            { nes_id: "nes:2", display_name: "Second Accused", entity_type: null, type: "accused" },
            { nes_id: "nes:3", display_name: "Jhapa", entity_type: null, type: "location" },
          ],
          ...card,
        } as CaseSearchCard)
      : undefined,
  };
}

describe("caseCardPropsFromSearchResult", () => {
  // The regression this module exists for. The homepage kept its own copy of
  // this mapping and never passed `bigo`, so the featured grid dropped the
  // बिगो row that the very same <CaseCard> rendered on /search.
  it("carries बिगो through, so every surface shows the amount", () => {
    expect(caseCardPropsFromSearchResult(searchResult({}), "en").bigo).toBe(9_000_000);
  });

  it("maps the indexed card onto the card's props", () => {
    const props = caseCardPropsFromSearchResult(searchResult({}), "en");

    expect(props).toMatchObject({
      id: "case-1",
      slug: "giribandhu-tea-estate",
      title: "Giribandhu Tea Estate Land Swap Scandal",
      tags: ["Land Grab"],
      // Every subject name, so <CaseCard> can say "X and N others" itself
      // rather than being handed a pre-truncated string.
      entityNames: ["Deepak Malhotra", "Second Accused"],
      entity: "Deepak Malhotra, Second Accused",
      entityIds: ["nes:1", "nes:2"],
      location: "Jhapa",
      locationIds: ["nes:3"],
    });
  });

  // Docs indexed before the card payload existed carry no `card` at all.
  it("falls back to the result envelope when the doc has no card payload", () => {
    const props = caseCardPropsFromSearchResult(searchResult(), "en");

    // Slug parsed out of the URL, and the highlight markup stripped off the title.
    expect(props.slug).toBe("giribandhu-tea-estate");
    expect(props.title).toBe("Indexed title");
    expect(props.entity).toBe("Unknown Entity");
    expect(props.location).toBe("Unknown Location");
  });

  it("drops nameless entities rather than listing them as placeholders", () => {
    const props = caseCardPropsFromSearchResult(
      searchResult({
        entities: [
          { nes_id: null, display_name: null, entity_type: null, type: "accused" },
          { nes_id: "nes:9", display_name: "Named Accused", entity_type: null, type: "accused" },
        ],
      }),
      "en",
    );

    expect(props.entityNames).toEqual(["Named Accused"]);
  });
});

describe("caseCardPropsFromCaseDetail", () => {
  const detail = {
    slug: "budhigandaki",
    title: "Budhigandaki Hydropower Project",
    tags: ["Hydropower"],
    bigo: 9_000_000_000,
    thumbnail: null,
    thumbnail_url: null,
    banner_url: null,
    status: "ongoing",
    proceedings_started_on: "2020-01-01",
    proceedings_decided_on: null,
    entities: [
      { nes_id: "nes:5", display_name: "CGGC", type: "accused" },
      { nes_id: "nes:6", display_name: "Gorkha", type: "location" },
    ],
  } as unknown as CaseDetail;

  // The fallback path must stay field-for-field with the indexed path above,
  // or a case loses data purely because of which path it happened to take.
  it("produces the same prop set as the indexed path", () => {
    const props = caseCardPropsFromCaseDetail(detail, searchResult(), "en");

    expect(props).toMatchObject({
      slug: "budhigandaki",
      title: "Budhigandaki Hydropower Project",
      tags: ["Hydropower"],
      bigo: 9_000_000_000,
      entityNames: ["CGGC"],
      location: "Gorkha",
    });
    expect(Object.keys(props).sort()).toEqual(
      Object.keys(caseCardPropsFromSearchResult(searchResult({}), "en")).sort(),
    );
  });

});
