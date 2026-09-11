import { describe, expect, it } from "vitest";

import type { CaseDates } from "@/types/jds";
import {
  caseStages,
  caseVerdictForum,
  isCaseStageName,
  soleInitialCourt,
  stageIsPending,
  stageLabelKey,
} from "@/utils/case-stages";

const dates = (stages: unknown[]): CaseDates => ({ stages } as CaseDates);

describe("caseStages", () => {
  it("returns the stages in the order the API served them", () => {
    // No client-side sort: after a remand a new first instance legitimately
    // starts after an appeal ended, so the served order is the real order.
    const stages = caseStages(
      dates([
        { stage: "appeal", start: "2022-01-01", end: "2022-06-01" },
        { stage: "initial", start: "2023-02-01" },
      ]),
    );

    expect(stages.map((s) => s.stage)).toEqual(["appeal", "initial"]);
  });

  it("is empty for a case with no dates payload at all", () => {
    expect(caseStages(undefined)).toEqual([]);
    expect(caseStages(null)).toEqual([]);
    expect(caseStages({} as CaseDates)).toEqual([]);
    expect(caseStages({ stages: "nope" } as unknown as CaseDates)).toEqual([]);
  });

  it("drops records outside the closed stage vocabulary", () => {
    // A stage typed `first_instance` is not renderable — this is exactly the
    // silent failure the admin dropdown exists to prevent.
    expect(
      caseStages(dates([{ stage: "first_instance" }, { stage: "initial" }])).map(
        (s) => s.stage,
      ),
    ).toEqual(["initial"]);
  });
});

describe("isCaseStageName", () => {
  it("accepts the five vocabulary values and nothing else", () => {
    for (const name of ["investigation", "initial", "appeal", "review", "other"]) {
      expect(isCaseStageName(name)).toBe(true);
    }
    expect(isCaseStageName("first_instance")).toBe(false);
    expect(isCaseStageName("INITIAL")).toBe(false);
    expect(isCaseStageName(undefined)).toBe(false);
  });
});

describe("stageLabelKey", () => {
  it("gives every stage its own label key", () => {
    expect(stageLabelKey("investigation")).toBe("caseDetail.stages.investigation");
    expect(stageLabelKey("initial")).toBe("caseDetail.stages.initial");
    expect(stageLabelKey("appeal")).toBe("caseDetail.stages.appeal");
    expect(stageLabelKey("review")).toBe("caseDetail.stages.review");
    expect(stageLabelKey("other")).toBe("caseDetail.stages.other");
  });
});

describe("stageIsPending", () => {
  it("is pending exactly when there is no end date", () => {
    expect(stageIsPending({ stage: "initial", start: "2023-01-01" })).toBe(true);
    expect(stageIsPending({ stage: "initial", end: "" })).toBe(true);
    expect(stageIsPending({ stage: "initial", end: null })).toBe(true);
    expect(stageIsPending({ stage: "initial", end: "2024-01-01" })).toBe(false);
  });
});

describe("soleInitialCourt", () => {
  it("names the court when the case has exactly one first-instance stage", () => {
    expect(
      soleInitialCourt(
        dates([
          { stage: "investigation" },
          {
            stage: "initial",
            courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060",
          },
          {
            stage: "appeal",
            courtcase_iri: "https://jawafdehi.org/courtcase/supreme/082-ne-0011",
          },
        ]),
      ),
    ).toBe("special");
  });

  it("names no court when several first-instance stages could be meant", () => {
    // One published case runs 12 dockets across 8 courts; guessing which one
    // decided a given defendant would be a fabricated fact.
    expect(
      soleInitialCourt(
        dates([
          {
            stage: "initial",
            courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060",
          },
          {
            stage: "initial",
            courtcase_iri: "https://jawafdehi.org/courtcase/kathmandudc/081-cr-0099",
          },
        ]),
      ),
    ).toBeNull();
  });

  it("names no court when the single first-instance stage cites no court case", () => {
    expect(soleInitialCourt(dates([{ stage: "initial" }]))).toBeNull();
    expect(
      soleInitialCourt(dates([{ stage: "initial", courtcase_iri: "special:081-CR-0060" }])),
    ).toBeNull();
  });

  it("names no court once a later court stage has CONCLUDED", () => {
    // `outcome` is a per-defendant field with no forum of its own, and a
    // terminal verdict is set from whatever primary court order was read --
    // an appellate order included. A defendant acquitted at the Special
    // Court and convicted on appeal would otherwise render as "Special
    // Court: convicted", which is false about a named real person and
    // strictly worse than the bare verdict it replaced.
    expect(
      soleInitialCourt(
        dates([
          {
            stage: "initial",
            courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060",
            start: "2022-01-10",
            end: "2024-05-22",
          },
          {
            stage: "appeal",
            courtcase_iri: "https://jawafdehi.org/courtcase/supreme/082-ne-0011",
            start: "2024-06-20",
            end: "2025-09-01",
          },
        ]),
      ),
    ).toBeNull();
  });

  it("still names it while the later stage is PENDING", () => {
    // The 22 cases this wording exists for: a Special Court acquittal with a
    // live CIAA appeal. An undecided appeal cannot have produced the
    // verdict, so the first instance is the only forum it can have come
    // from — and naming it is exactly the improvement over a bare label.
    expect(
      soleInitialCourt(
        dates([
          {
            stage: "initial",
            courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060",
            start: "2022-01-10",
            end: "2024-05-22",
          },
          {
            stage: "appeal",
            courtcase_iri: "https://jawafdehi.org/courtcase/supreme/082-ne-0011",
            start: "2024-06-20",
          },
        ]),
      ),
    ).toBe("special");
  });

  it("ignores a concluded INVESTIGATION, which decides nothing", () => {
    expect(
      soleInitialCourt(
        dates([
          { stage: "investigation", start: "2021-03-14", end: "2022-01-09" },
          {
            stage: "initial",
            courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060",
            start: "2022-01-10",
            end: "2024-05-22",
          },
        ]),
      ),
    ).toBe("special");
  });

  it("names no court for a case with no first-instance stage (a Supreme Court writ)", () => {
    expect(
      soleInitialCourt(
        dates([
          {
            stage: "review",
            courtcase_iri: "https://jawafdehi.org/courtcase/supreme/081-wo-0001",
          },
        ]),
      ),
    ).toBeNull();
    expect(soleInitialCourt(undefined)).toBeNull();
  });
});

// The forum a per-defendant verdict is attributed to on the case page.
describe("caseVerdictForum", () => {
  const oneInstance = dates([
    {
      stage: "initial",
      courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060",
    },
  ]);

  it("names the single first-instance court in the reader's language", () => {
    expect(caseVerdictForum(oneInstance, "en")).toBe("Special Court");
    expect(caseVerdictForum(oneInstance, "ne")).toBe("विशेष अदालत");
  });

  it("names nothing when there is no single first instance to attribute to", () => {
    expect(
      caseVerdictForum(
        dates([
          { stage: "initial", courtcase_iri: "https://jawafdehi.org/courtcase/special/081-cr-0060" },
          { stage: "initial", courtcase_iri: "https://jawafdehi.org/courtcase/butwalhc/081-cr-0061" },
        ]),
        "en",
      ),
    ).toBeNull();
    expect(caseVerdictForum(undefined, "en")).toBeNull();
  });
});
