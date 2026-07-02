import { describe, it, expect } from "vitest";
import {
  slugify,
  isValidSlug,
  isValidDateField,
  isValidCourtCaseRef,
  isValidEntityRow,
  isValidTimelineRow,
  buildEntitiesPatch,
  buildTimelinePatch,
  buildEvidencePatch,
  buildStringListPatch,
  replaceOp,
  type EntityRelationshipRow,
  type TimelineEventRow,
  type EvidenceRow,
} from "./jawafdehi-forms";

const IRI = "https://jawafdehi.org/entity/person/ram-bahadur";

describe("slugify / isValidSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("  Big Corruption Case! ")).toBe("big-corruption-case");
    expect(slugify("Multiple   spaces")).toBe("multiple-spaces");
  });
  it("validates slug shape", () => {
    expect(isValidSlug("valid-slug-1")).toBe(true);
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("UPPER")).toBe(false);
    expect(isValidSlug("has space")).toBe(false);
  });
});

describe("isValidDateField", () => {
  it("accepts empty and YYYY-MM-DD", () => {
    expect(isValidDateField("")).toBe(true);
    expect(isValidDateField("2024-01-02")).toBe(true);
    expect(isValidDateField("2080-9-8")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(isValidDateField("Jan 2 2024")).toBe(false);
    expect(isValidDateField("2024/01/02")).toBe(false);
  });
});

describe("isValidCourtCaseRef", () => {
  it("accepts court:case_number", () => {
    expect(isValidCourtCaseRef("special:081-CR-0136")).toBe(true);
    expect(isValidCourtCaseRef("e2e-district-court:E2E-001")).toBe(true);
  });
  it("rejects missing colon or scheme", () => {
    expect(isValidCourtCaseRef("special")).toBe(false);
    expect(isValidCourtCaseRef("https://x/y")).toBe(false);
  });
});

describe("isValidEntityRow", () => {
  it("needs a valid IRI and a known relationship type", () => {
    expect(
      isValidEntityRow({ nes_id: IRI, relationship_type: "ACCUSED", notes: "" }),
    ).toBe(true);
    expect(
      isValidEntityRow({ nes_id: "not-an-iri", relationship_type: "ACCUSED", notes: "" }),
    ).toBe(false);
    expect(
      isValidEntityRow({
        nes_id: IRI,
        // @ts-expect-error deliberately invalid enum value
        relationship_type: "BOGUS",
        notes: "",
      }),
    ).toBe(false);
  });
});

describe("isValidTimelineRow", () => {
  it("needs title + valid AD date", () => {
    expect(
      isValidTimelineRow({ date: "2024-01-02", date_bs: "", title: "x", description: "" }),
    ).toBe(true);
    expect(
      isValidTimelineRow({ date: "", date_bs: "", title: "x", description: "" }),
    ).toBe(false);
    expect(
      isValidTimelineRow({ date: "2024-01-02", date_bs: "", title: "", description: "" }),
    ).toBe(false);
  });
});

describe("replaceOp", () => {
  it("builds a replace op", () => {
    expect(replaceOp("/bigo", 100)).toEqual({ op: "replace", path: "/bigo", value: 100 });
  });
});

describe("buildEntitiesPatch", () => {
  it("replaces /entities and drops blank rows", () => {
    const rows: EntityRelationshipRow[] = [
      { nes_id: IRI, relationship_type: "ACCUSED", notes: "lead" },
      { nes_id: "  ", relationship_type: "WITNESS", notes: "" },
    ];
    expect(buildEntitiesPatch(rows)).toEqual({
      op: "replace",
      path: "/entities",
      value: [{ nes_id: IRI, relationship_type: "ACCUSED", notes: "lead" }],
    });
  });
  it("emits an empty list to clear all entities", () => {
    expect(buildEntitiesPatch([])).toEqual({
      op: "replace",
      path: "/entities",
      value: [],
    });
  });
});

describe("buildTimelinePatch", () => {
  it("replaces /timeline and trims fields", () => {
    const rows: TimelineEventRow[] = [
      { date: " 2024-01-02 ", date_bs: " 2080-09-18 ", title: " First ", description: "d" },
      { date: "", date_bs: "", title: "", description: "" },
    ];
    expect(buildTimelinePatch(rows)).toEqual({
      op: "replace",
      path: "/timeline",
      value: [
        { date: "2024-01-02", date_bs: "2080-09-18", title: "First", description: "d" },
      ],
    });
  });
});

describe("buildEvidencePatch", () => {
  it("replaces /evidence with material references and drops blank IRIs", () => {
    const rows: EvidenceRow[] = [
      {
        material_iri: "https://jawafdehi.org/material/ciaa/report-1",
        additional_details: " key filing ",
      },
      { material_iri: "  ", additional_details: "orphan" },
    ];
    expect(buildEvidencePatch(rows)).toEqual({
      op: "replace",
      path: "/evidence",
      value: [
        {
          material_iri: "https://jawafdehi.org/material/ciaa/report-1",
          additional_details: "key filing",
        },
      ],
    });
  });
});

describe("buildStringListPatch", () => {
  it("trims and de-blanks", () => {
    expect(buildStringListPatch("/tags", [" ciaa ", "", "procurement"])).toEqual({
      op: "replace",
      path: "/tags",
      value: ["ciaa", "procurement"],
    });
  });
});
