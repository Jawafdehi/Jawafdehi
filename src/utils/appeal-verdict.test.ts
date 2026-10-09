import { describe, expect, it } from "vitest";

import type { CaseDates, JawafEntity } from "@/types/jds";
import { outcomeBadgeClass } from "@/utils/case-outcome";
import {
  appealBadgeClass,
  appealResult,
  appealSummaryCaveat,
  appealSummarySentence,
  appealWithForumLabel,
  decidedAppeals,
  personalAppeal,
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

describe("personalAppeal", () => {
  const verdicts = { [SUPREME]: "REVERSED" };

  it("belongs to the defendant when there is exactly one accused", () => {
    expect(personalAppeal([accused("dinesh"), location], decided, verdicts, "en")).toEqual({
      result: "overturned",
      forum: "Supreme Court",
    });
  });

  it("belongs to nobody on a multi-accused case", () => {
    expect(personalAppeal([accused("a"), accused("b")], decided, verdicts, "en")).toBeNull();
  });

  it("belongs to nobody when the case has two appeals", () => {
    const two: CaseDates = {
      stages: [
        ...decided.stages,
        { stage: "appeal", courtcase_iri: SUPREME_2, start: "2023-01-01", end: "2024-01-01" },
      ],
    };
    expect(
      personalAppeal([accused("a")], two, { ...verdicts, [SUPREME_2]: "AFFIRMED" }, "en"),
    ).toBeNull();
  });

  it("is null while the appeal is pending", () => {
    expect(personalAppeal([accused("a")], pending, { [SUPREME]: null }, "en")).toBeNull();
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

  it("states the case-level result against the first-instance court", () => {
    const appeal = { result: "partly_overturned" as const, forum: "Supreme Court" };
    expect(appealSummarySentence(appeal, "Special Court", "en")).toBe(
      "On appeal, the Supreme Court partly overturned the Special Court's decision.",
    );
    expect(
      appealSummarySentence({ result: "upheld", forum: "सर्वोच्च अदालत" }, "विशेष अदालत", "ne"),
    ).toBe("पुनरावेदनमा सर्वोच्च अदालतले विशेष अदालतको फैसला सदर गरेको छ।");
  });

  it("never names whose verdict a partial reversal changed", () => {
    const caveat = appealSummaryCaveat("partly_overturned", "Special Court", "en");
    expect(caveat).toMatch(/cannot say whose verdict changed/);
    expect(caveat).toMatch(/The verdicts below are the Special Court's\./);
  });

  it("drops the attribution when there is no single first instance", () => {
    expect(appealSummaryCaveat("upheld", null, "en")).toBe(
      "The appeal may not cover every defendant listed below.",
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
