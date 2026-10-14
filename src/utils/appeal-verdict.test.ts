import { describe, expect, it } from "vitest";

import type { CaseDates, JawafEntity } from "@/types/jds";
import { outcomeBadgeClass } from "@/utils/case-outcome";
import {
  appealBadgeClass,
  appealResult,
  appealWithForumLabel,
  accusedAppeal,
  decidedAppeals,
} from "@/utils/appeal-verdict";

const SPECIAL = "https://jawafdehi.org/courtcase/special/071-cr-0255";
const SUPREME = "https://jawafdehi.org/courtcase/supreme/073-cr-0904";
const SUPREME_2 = "https://jawafdehi.org/courtcase/supreme/074-cr-0001";

const decided: CaseDates = {
  stages: [
    { stage: "initial", courtcase_iri: SPECIAL, start: "2015-03-09", end: "2016-09-08" },
    { stage: "appeal", courtcase_iri: SUPREME, start: "2017-01-22", end: "2022-01-06" },
  ],
};
const pending: CaseDates = {
  stages: [
    { stage: "initial", courtcase_iri: SPECIAL, start: "2015-03-09", end: "2016-09-08" },
    { stage: "appeal", courtcase_iri: SUPREME, start: "2017-01-22" },
  ],
};

const accused = (name: string): JawafEntity => ({
  nes_id: `https://jawafdehi.org/entity/person/${name}`,
  display_name: name,
  type: "accused",
  outcome: "convicted",
});
const location: JawafEntity = { nes_id: null, display_name: "Kawasoti", type: "location" };

describe("appealResult", () => {
  it("reads a failed appeal as upheld, never as 'claim denied'", () => {
    expect(appealResult("AFFIRMED")).toBe("upheld");
    expect(appealResult("CLAIM_DENIED")).toBe("upheld");
  });

  it("maps the reversals", () => {
    expect(appealResult("REVERSED")).toBe("overturned");
    expect(appealResult("PARTIALLY_REVERSED")).toBe("partly_overturned");
  });

  it("says nothing for a pending or unclassifiable verdict", () => {
    for (const v of [null, undefined, "", "PROCEDURAL", "STRUCK_OFF", "ACQUITTED"]) {
      expect(appealResult(v)).toBeNull();
    }
  });
});

describe("decidedAppeals", () => {
  it("names the appeal court in the reader's language", () => {
    const verdicts = { [SUPREME]: "REVERSED" };
    expect(decidedAppeals(decided, verdicts, "en")).toEqual([
      { result: "overturned", forum: "Supreme Court" },
    ]);
    expect(decidedAppeals(decided, verdicts, "ne")[0].forum).toBe("सर्वोच्च अदालत");
  });

  it("ignores an appeal stage with no end date even if a verdict is served", () => {
    expect(decidedAppeals(pending, { [SUPREME]: "AFFIRMED" }, "en")).toEqual([]);
  });

  it("is empty without appeal_verdicts", () => {
    expect(decidedAppeals(decided, undefined, "en")).toEqual([]);
  });
});

describe("accusedAppeal", () => {
  const reversed = { [SUPREME]: "REVERSED" };
  const upheld = { [SUPREME]: "AFFIRMED" };
  const [a, b, c] = [accused("a"), accused("b"), accused("c")];
  const onAppeal = (...people: JawafEntity[]) => ({ [SUPREME]: people.map((p) => p.nes_id!) });

  describe("one accused", () => {
    it("is the defendant's, whatever the appeal did", () => {
      expect(accusedAppeal(a, [a, location], decided, reversed, undefined, "en")).toEqual({
        result: "overturned",
        forum: "Supreme Court",
      });
    });

    it("still is when the docket's parties confirm them", () => {
      expect(accusedAppeal(a, [a], decided, reversed, onAppeal(a), "en")?.result).toBe("overturned");
    });

    it("is not when the docket's parties name someone else", () => {
      expect(accusedAppeal(a, [a], decided, reversed, onAppeal(b), "en")).toBeNull();
    });

    it("is nobody's when the case has two appeals", () => {
      const two: CaseDates = {
        stages: [
          ...decided.stages,
          { stage: "appeal", courtcase_iri: SUPREME_2, start: "2023-01-01", end: "2024-01-01" },
        ],
      };
      expect(accusedAppeal(a, [a], two, { ...reversed, [SUPREME_2]: "AFFIRMED" }, undefined, "en")).toBeNull();
    });

    it("is null while the appeal is pending", () => {
      expect(accusedAppeal(a, [a], pending, { [SUPREME]: null }, undefined, "en")).toBeNull();
    });
  });

  describe("several accused", () => {
    it("shows an upheld appeal to an accused who was on it", () => {
      expect(accusedAppeal(a, [a, b], decided, upheld, onAppeal(a, b), "ne")).toEqual({
        result: "upheld",
        forum: "सर्वोच्च अदालत",
      });
    });

    it("reads a denied appeal as upheld too", () => {
      expect(
        accusedAppeal(a, [a, b], decided, { [SUPREME]: "CLAIM_DENIED" }, onAppeal(a), "en")?.result,
      ).toBe("upheld");
    });

    it("shows nothing to an accused the appeal left out", () => {
      expect(accusedAppeal(c, [a, b, c], decided, upheld, onAppeal(a, b), "en")).toBeNull();
    });

    it("shows nothing for a reversal: the docket verdict cannot say what changed for whom", () => {
      expect(accusedAppeal(a, [a, b], decided, reversed, onAppeal(a, b), "en")).toBeNull();
      expect(
        accusedAppeal(a, [a, b], decided, { [SUPREME]: "PARTIALLY_REVERSED" }, onAppeal(a, b), "en"),
      ).toBeNull();
    });

    it("shows nothing before the API says who was on the appeal", () => {
      expect(accusedAppeal(a, [a, b], decided, upheld, undefined, "en")).toBeNull();
      expect(accusedAppeal(a, [a, b], decided, upheld, { [SUPREME]: [] }, "en")).toBeNull();
    });

    it("uses the one appeal the accused was on when the case has two", () => {
      const two: CaseDates = {
        stages: [
          ...decided.stages,
          { stage: "appeal", courtcase_iri: SUPREME_2, start: "2023-01-01", end: "2024-01-01" },
        ],
      };
      const verdicts = { [SUPREME]: "REVERSED", [SUPREME_2]: "AFFIRMED" };
      const parties = { [SUPREME]: [b.nes_id!], [SUPREME_2]: [a.nes_id!] };
      expect(accusedAppeal(a, [a, b], two, verdicts, parties, "en")?.result).toBe("upheld");
    });

    it("shows nothing to an accused on two decided appeals", () => {
      const two: CaseDates = {
        stages: [
          ...decided.stages,
          { stage: "appeal", courtcase_iri: SUPREME_2, start: "2023-01-01", end: "2024-01-01" },
        ],
      };
      const verdicts = { [SUPREME]: "AFFIRMED", [SUPREME_2]: "AFFIRMED" };
      const parties = { [SUPREME]: [a.nes_id!], [SUPREME_2]: [a.nes_id!] };
      expect(accusedAppeal(a, [a, b], two, verdicts, parties, "en")).toBeNull();
    });
  });

  it("is never drawn for anyone but an accused", () => {
    expect(accusedAppeal(location, [a, location], decided, upheld, onAppeal(a), "en")).toBeNull();
  });
});

describe("labels", () => {
  it("names the court before the result", () => {
    expect(appealWithForumLabel({ result: "overturned", forum: "Supreme Court" }, "en")).toBe(
      "Supreme Court: overturned",
    );
    expect(appealWithForumLabel({ result: "upheld", forum: "सर्वोच्च अदालत" }, "ne")).toBe(
      "सर्वोच्च अदालत: सदर",
    );
  });
});

describe("appealBadgeClass", () => {
  it("keeps the verdict's colour when the appeal upheld it", () => {
    expect(appealBadgeClass("upheld", "convicted")).toBe(outcomeBadgeClass("convicted"));
    expect(appealBadgeClass("upheld", "acquitted")).toBe(outcomeBadgeClass("acquitted"));
  });

  it("never repeats the verdict's colour on a reversal", () => {
    for (const result of ["overturned", "partly_overturned"] as const) {
      expect(appealBadgeClass(result, "convicted")).not.toBe(outcomeBadgeClass("convicted"));
      expect(appealBadgeClass(result, "acquitted")).not.toBe(outcomeBadgeClass("acquitted"));
      expect(appealBadgeClass(result, "convicted")).toMatch(/bg-secondary/);
    }
  });
});
