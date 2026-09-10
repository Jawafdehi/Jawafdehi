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
  buildStagesPatch,
  isValidStageRow,
  stageRowError,
  STAGE_NOTES_MAX,
  replaceOp,
  type EntityRelationshipRow,
  type TimelineEventRow,
  type EvidenceRow,
  type CaseStageRow,
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
  it("accepts canonical court-case @id IRIs (the only format)", () => {
    expect(
      isValidCourtCaseRef("https://jawafdehi.org/courtcase/special/080-cr-0111"),
    ).toBe(true);
  });
  it("rejects the retired colon spelling and non-courtcase IRIs", () => {
    expect(isValidCourtCaseRef("special:081-CR-0136")).toBe(false);
    expect(isValidCourtCaseRef("special")).toBe(false);
    expect(isValidCourtCaseRef("https://x/y")).toBe(false);
    expect(isValidCourtCaseRef("https://jawafdehi.org/entity/person/foo")).toBe(false);
  });
});

describe("isValidEntityRow", () => {
  it("needs a valid IRI and a known relationship type", () => {
    expect(
      isValidEntityRow({ nes_id: IRI, relationship_type: "ACCUSED", outcome: "CHARGED", notes: "" }),
    ).toBe(true);
    expect(
      isValidEntityRow({ nes_id: "not-an-iri", relationship_type: "ACCUSED", outcome: "CHARGED", notes: "" }),
    ).toBe(false);
    // A blank / whitespace-only IRI row is invalid: the form blocks save on it (BB-27) rather than letting the patch builder silently drop the row and vanish on reload.
    expect(
      isValidEntityRow({ nes_id: "", relationship_type: "ACCUSED", outcome: "CHARGED", notes: "" }),
    ).toBe(false);
    expect(
      isValidEntityRow({ nes_id: "   ", relationship_type: "WITNESS", outcome: null, notes: "" }),
    ).toBe(false);
    expect(
      isValidEntityRow({
        nes_id: IRI,
        // @ts-expect-error deliberately invalid enum value
        relationship_type: "BOGUS",
        outcome: "CHARGED",
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
      { nes_id: IRI, relationship_type: "ACCUSED", outcome: "CONVICTED", notes: "lead" },
      { nes_id: "  ", relationship_type: "WITNESS", outcome: "CHARGED", notes: "" },
    ];
    expect(buildEntitiesPatch(rows)).toEqual({
      op: "replace",
      path: "/entities",
      value: [{ nes_id: IRI, relationship_type: "ACCUSED", outcome: "CONVICTED", notes: "lead" }],
    });
  });
  it("emits an empty list to clear all entities", () => {
    expect(buildEntitiesPatch([])).toEqual({
      op: "replace",
      path: "/entities",
      value: [],
    });
  });
  it("sends outcome null for non-accused roles (a verdict is accused-only)", () => {
    const rows: EntityRelationshipRow[] = [
      { nes_id: IRI, relationship_type: "RELATED", outcome: "CONVICTED", notes: "" },
      { nes_id: IRI, relationship_type: "LOCATION", outcome: null, notes: "" },
    ];
    const value = (buildEntitiesPatch(rows).value as { outcome: unknown }[]).map(
      (v) => v.outcome,
    );
    expect(value).toEqual([null, null]);
  });
  it("falls back to CHARGED for an accused row with no verdict", () => {
    const rows: EntityRelationshipRow[] = [
      { nes_id: IRI, relationship_type: "ACCUSED", outcome: null, notes: "" },
    ];
    const value = buildEntitiesPatch(rows).value as { outcome: unknown }[];
    expect(value[0].outcome).toBe("CHARGED");
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


const stageRow = (over: Partial<CaseStageRow> = {}): CaseStageRow => ({
  stage: "initial",
  start: "",
  end: "",
  courtcase_iri: "",
  body: "",
  label: "",
  notes: "",
  ...over,
});

describe("stageRowError", () => {
  it("accepts a stage with no dates at all — the case may not have started", () => {
    expect(stageRowError(stageRow())).toBeNull();
    expect(isValidStageRow(stageRow())).toBe(true);
  });

  it("accepts an open stage, and one that starts and ends on the same day", () => {
    expect(stageRowError(stageRow({ start: "2023-01-01" }))).toBeNull();
    expect(stageRowError(stageRow({ end: "2023-01-01" }))).toBeNull();
    expect(
      stageRowError(stageRow({ start: "2023-01-01", end: "2023-01-01" })),
    ).toBeNull();
  });

  it("rejects a stage that ends before it starts", () => {
    expect(
      stageRowError(stageRow({ start: "2023-06-09", end: "2023-01-01" })),
    ).toBe("endBeforeStart");
    expect(
      isValidStageRow(stageRow({ start: "2023-06-09", end: "2023-01-01" })),
    ).toBe(false);
  });

  it("imposes NO ordering between stages", () => {
    // After a remand a new first instance legitimately starts after an appeal
    // ended, so each row is judged only against itself.
    const rows = [
      stageRow({ stage: "appeal", start: "2022-01-01", end: "2022-06-01" }),
      stageRow({ stage: "initial", start: "2021-01-01", end: "2021-06-01" }),
      stageRow({ stage: "initial", start: "2023-01-01" }),
    ];
    expect(rows.every(isValidStageRow)).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(stageRowError(stageRow({ start: "Jan 2 2024" }))).toBe("invalidDate");
    expect(stageRowError(stageRow({ end: "2024/01/02" }))).toBe("invalidDate");
  });

  it("rejects a public note over the 500-character cap", () => {
    expect(stageRowError(stageRow({ notes: "क".repeat(STAGE_NOTES_MAX) }))).toBeNull();
    expect(stageRowError(stageRow({ notes: "क".repeat(STAGE_NOTES_MAX + 1) }))).toBe(
      "notesTooLong",
    );
  });

  it("rejects a stage type outside the closed vocabulary", () => {
    // `tags` drifted to 144 distinct values across 82 cases under a free-text
    // schema; a stage typed `first_instance` would simply never render.
    expect(
      stageRowError(stageRow({ stage: "first_instance" as CaseStageRow["stage"] })),
    ).toBe("unknownStage");
  });
});

describe("buildStagesPatch", () => {
  it("replaces /dates with the whole stage list", () => {
    const op = buildStagesPatch([
      stageRow({ stage: "investigation", start: "2021-03-01", end: "2021-09-14" }),
      stageRow({ stage: "initial", start: "2021-10-02" }),
    ]);

    expect(op).toEqual({
      op: "replace",
      path: "/dates",
      value: {
        stages: [
          { stage: "investigation", start: "2021-03-01", end: "2021-09-14" },
          { stage: "initial", start: "2021-10-02" },
        ],
      },
    });
  });

  it("omits empty optional fields rather than sending blanks", () => {
    const op = buildStagesPatch([
      stageRow({
        stage: "appeal",
        start: " 2023-07-11 ",
        courtcase_iri: " https://jawafdehi.org/courtcase/supreme/080-ne-0044 ",
        body: " Supreme Court ",
        notes: " इजलास गठन नभएको ",
      }),
    ]);

    expect(op.value).toEqual({
      stages: [
        {
          stage: "appeal",
          start: "2023-07-11",
          courtcase_iri: "https://jawafdehi.org/courtcase/supreme/080-ne-0044",
          body: "Supreme Court",
          notes: "इजलास गठन नभएको",
        },
      ],
    });
  });

  it("carries a label only on an `other` stage", () => {
    expect(
      buildStagesPatch([stageRow({ stage: "other", label: "Arbitration tribunal" })])
        .value,
    ).toEqual({ stages: [{ stage: "other", label: "Arbitration tribunal" }] });

    // A label left behind after switching the type back is not sent.
    expect(
      buildStagesPatch([stageRow({ stage: "appeal", label: "Arbitration tribunal" })])
        .value,
    ).toEqual({ stages: [{ stage: "appeal" }] });
  });

  it("sends an empty stage list rather than nothing, so a stage can be deleted", () => {
    expect(buildStagesPatch([]).value).toEqual({ stages: [] });
  });
});
