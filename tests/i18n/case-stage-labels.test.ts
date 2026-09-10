import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CASE_STAGE_NAMES, stageLabelKey } from "../../src/utils/case-stages";

// The stage vocabulary is rendered through i18n, so a key that exists in the
// code and not in the locale files renders the key itself to the reader. The
// Nepali terms are the authoritative ones: शुरु is the standard word for the
// court of first instance, and the English side follows it.
const ROOT = resolve(process.cwd());
const locale = (lang: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(ROOT, `src/i18n/locales/${lang}.json`), "utf8"));

const en = locale("en");
const ne = locale("ne");

function at(bundle: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      bundle,
    );
}

describe("case stage labels", () => {
  it("gives every stage in the vocabulary a label in BOTH locales", () => {
    for (const stage of CASE_STAGE_NAMES) {
      const key = stageLabelKey(stage);
      expect(at(en, key), `${key} missing from en.json`).toBeTypeOf("string");
      expect(at(ne, key), `${key} missing from ne.json`).toBeTypeOf("string");
    }
  });

  it("uses the standard Nepali legal terms", () => {
    expect(at(ne, "caseDetail.stages.investigation")).toBe("अनुसन्धान");
    expect(at(ne, "caseDetail.stages.initial")).toBe("शुरु");
    expect(at(ne, "caseDetail.stages.appeal")).toBe("पुनरावेदन");
    expect(at(ne, "caseDetail.stages.review")).toBe("पुनरावलोकन");
    expect(at(ne, "caseDetail.stages.other")).toBe("अन्य");
  });

  it("says a decision has not come for a pending stage, in both locales", () => {
    // NOT "no date" — the date is not missing, the decision is.
    expect(at(en, "caseDetail.stagePending")).toBeTypeOf("string");
    expect(at(ne, "caseDetail.stagePending")).toBe("फैसला बाँकी");
  });

  it("names the new lifecycle values a case can carry", () => {
    for (const status of ["withdrawn", "dormant"]) {
      expect(at(en, `caseDetail.status.${status}`)).toBeTypeOf("string");
      expect(at(ne, `caseDetail.status.${status}`)).toBeTypeOf("string");
    }
  });

  it("gives the admin stage editor its strings in both locales", () => {
    const keys = [
      "admin.caseForm.stagesHeading",
      "admin.caseForm.stagesHelp",
      "admin.caseForm.stageAdd",
      "admin.caseForm.stageRemove",
      "admin.caseForm.stageRowLabel",
      "admin.caseForm.stageType",
      "admin.caseForm.stageLabel",
      "admin.caseForm.stageBody",
      "admin.caseForm.stageCourtCase",
      "admin.caseForm.stageNotes",
      "admin.caseForm.stageNotesHelp",
      "admin.caseForm.stageEndBeforeStart",
      "admin.caseForm.stageUnknownType",
      "admin.caseForm.stageDateInvalid",
      "admin.caseForm.stageNotesTooLong",
      "admin.caseForm.stageRowsInvalid",
      "admin.caseForm.stageStart",
      "admin.caseForm.stageEnd",
      "admin.caseForm.stageNone",
    ];
    for (const key of keys) {
      expect(at(en, key), `${key} missing from en.json`).toBeTypeOf("string");
      expect(at(ne, key), `${key} missing from ne.json`).toBeTypeOf("string");
    }
  });
});
