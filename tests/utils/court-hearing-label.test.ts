import { describe, expect, it } from "vitest";

import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import {
  CUSTODY_LABELS,
  HEARING_LABELS,
  VERDICT_LABELS,
  caseDecision,
  caseIsDecided,
  courtText,
  hearingLabel,
} from "@/utils/court-hearing-label";
import type { CourtCaseHearing } from "@/types/jds";

const row = (case_status: string | null, decision_type: string | null = "") => ({
  case_status: case_status as string,
  decision_type: decision_type as string,
});

const hearing = (
  hearing_date_bs: string,
  case_status: string,
  decision_type = "",
): CourtCaseHearing => ({
  id: 1,
  case_number: "083-WH-0093",
  court_identifier: "supreme",
  hearing_date_bs,
  hearing_date_ad: "2026-10-09",
  bench: null,
  bench_type: "",
  judge_names: null,
  lawyer_names: null,
  serial_no: "",
  case_status,
  decision_type,
  remarks: "",
});

describe("hearingLabel — never invents an order", () => {
  it.each([
    [null, null],
    ["", ""],
    ["  ", "   "],
  ])("a row with no status and no decision is a listing (%j, %j)", (status, decision) => {
    const label = hearingLabel(row(status, decision));
    expect(label.kind).toBe("listed");
    expect(label.isOrder).toBe(false);
    expect(label.labelFallback).toBe("Listed for hearing");
    expect(label.labelNe).toBe("सुनुवाइका लागि सूचीकृत");
  });

  // 083-WH-0084, 2083-07-13: the court records हेर्न नभ्याइने (not reached).
  it("reads the Supreme Court's 'not reached' as not reached, not an order", () => {
    expect(hearingLabel(row("हेर्न नभ्याइने")).kind).toBe("notReached");
    expect(hearingLabel(row("हेर्न नभ्याइने")).isOrder).toBe(false);
  });

  it("reads the Special Court's spelling नभ्याउने the same way", () => {
    expect(hearingLabel(row("नभ्याउने", "प्र.को कानुन ब्यवसायी बाट")).kind).toBe("notReached");
  });
});

// Every status value in the Supreme Court hearing corpus (2016-08 → 2026-11-02,
// 753,881 rows) and in a 300-case Special Court sample, with what it must read as.
describe("hearingLabel — the courts' real status vocabulary", () => {
  it.each([
    // Supreme
    ["हेर्न नभ्याइने", "", "notReached"],
    ["स्थगीत", "पक्षको कानुन व्यवसायी बाट", "adjourned"],
    ["स्थगित", "लगाउको कारण स्थगित", "adjourned"],
    ["हेर्न नमिल्ने", "", "cannotHear"],
    ["आदेश", "कारण देखाउ आदेश", "order"],
    ["आदेश", "मिसिल झिकाउने", "order"],
    ["फैसला", "रिट खारेज", "decision"],
    ["अन्तिम आदेश", "कैफियत प्रतिवेदन माग्ने", "final"],
    ["बेन्च नबसेको", "", "benchDidNotSit"],
    ["बेन्च बस्न नभ्याएको", "", "benchDidNotSit"],
    ["हेर्दाहेर्दै", "", "partHeard"],
    // Special
    ["नभ्याउने", "", "notReached"],
    ["आदेश", "हेर्दा हेर्दै भोलीलाई", "order"],
    ["आदेश", "अन्य आदेश", "order"],
    ["फैसला", "सफाई", "decision"],
    ["फैसला", "आंशिक ठहर", "decision"],
    ["फैसला (मिती: २०७८/०४/३१)", "", "decision"],
    ["अन्तिम आदेश", "अन्य", "final"],
  ])("%s / %s → %s", (status, decision, kind) => {
    expect(hearingLabel(row(status, decision)).kind).toBe(kind);
  });

  it.each(["नि।सु।", "नि.सु.", "सुनुवाई भैसकेको", "यसपछिको सुनुवाइ", "खाजा पछि"])(
    "shows an unrecognised status (%s) verbatim in both languages",
    (status) => {
      const label = hearingLabel(row(status));
      expect(label.kind).toBe("court");
      expect(label.labelKey).toBeNull();
      expect(label.labelFallback).toBe(status);
      expect(label.labelNe).toBe(status);
      expect(label.isOrder).toBe(false);
    },
  );

  it("treats an adjournment's reason as details, not as an order", () => {
    expect(hearingLabel(row("स्थगित", "प्र.को कानुन ब्यवसायी बाट")).isOrder).toBe(false);
  });

  it("final order is the court's अन्तिम आदेश, not a plain order", () => {
    // 23,676 Supreme rows used to read as plain "आदेश" (only decision_type was checked).
    expect(hearingLabel(row("अन्तिम आदेश", "मागबमोजिम हुने")).labelNe).toBe("अन्तिम आदेश");
  });
});

describe("hearingLabel — थुनछेक (custody hearing) orders", () => {
  // 082-CR-0154, 2083-03-03, and 083-OA-0123: the court ordered CUSTODY.
  it("custody is not bail", () => {
    const label = hearingLabel(row("आदेश", "थुनछेक आदेश (थुनामा राख्ने)"));
    expect(label.kind).toBe("custody");
    expect(label.labelNe).toBe("थुनछेक आदेश (थुनामा राख्ने)");
    expect(label.labelFallback).toBe("Custody hearing: held in custody");
    expect(label.labelNe).not.toContain("धरौटी");
  });

  it("an application's custody order marked अन्तिम आदेश is still custody", () => {
    expect(hearingLabel(row("अन्तिम आदेश", "थुनछेक आदेश (थुनामा राख्ने)")).kind).toBe("custody");
  });

  it("release on an ordinary date is not bail", () => {
    const label = hearingLabel(row("अन्तिम आदेश", "थुनछेक आदेश (साधारण तारिख)"));
    expect(label.kind).toBe("custody");
    expect(label.labelFallback).toBe("Custody hearing: released on ordinary date");
  });

  it("bail is bail", () => {
    const label = hearingLabel(row("आदेश", "थुनछेक आदेश (धरौटी)"));
    expect(label.kind).toBe("bail");
    expect(label.labelNe).toBe("थुनछेक आदेश (धरौटी)");
  });

  it("an unrecognised bracket names the hearing without guessing its result", () => {
    const label = hearingLabel(row("आदेश", "थुनछेक आदेश (अन्य)"));
    expect(label.kind).toBe("custody");
    expect(label.labelFallback).toBe("Custody hearing order");
  });

  it("an adjourned custody hearing is adjourned, not an order", () => {
    expect(hearingLabel(row("स्थगित", "थुनछेक")).kind).toBe("adjourned");
  });

  it("a plain order demanding bail is a bail order", () => {
    expect(hearingLabel(row("आदेश", "आदेश >> धरौटी माग गर्ने")).kind).toBe("bail");
  });
});

describe("labels are translated in both locales", () => {
  const all = [...Object.values(HEARING_LABELS), ...CUSTODY_LABELS];
  const lookup = (tree: unknown, key: string) =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], tree);

  it.each(all.map((l) => [l.labelKey, l]))("%s", (key, l) => {
    expect(lookup(en, key as string)).toBe(l.labelFallback);
    expect(lookup(ne, key as string)).toBe(l.labelNe);
  });

  it("has the Details caption and the Decision label", () => {
    expect(lookup(ne, "courtCaseProfile.activity.details")).toBe("विवरण");
    expect(lookup(en, "courtCaseProfile.labels.decision")).toBe("Decision");
    expect(lookup(ne, "courtCaseProfile.labels.decision")).toBe("निर्णय");
  });
});

describe("courtText", () => {
  it("drops the portal's trailing 'view file' link text", () => {
    expect(courtText("रिट खारेज फाइल हेर्नुहोस्")).toBe("रिट खारेज");
    expect(courtText("  रिट   खारेज ")).toBe("रिट खारेज");
  });
});

describe("caseDecision", () => {
  const base = { case_status: null, verdict_date_bs: null, verdict_type: null, hearings: [] };

  it("takes the outcome from the register's '>>' status", () => {
    expect(caseDecision({ ...base, case_status: "फैसला / अन्तिम आदेश >> अभियोग दाबी नपुग्ने" })).toEqual({
      outcome: "अभियोग दाबी नपुग्ने",
      source: "court",
    });
  });

  it("takes the court's wording from the sitting on the verdict date", () => {
    const decision = caseDecision({
      ...base,
      verdict_date_bs: "2083-06-23",
      verdict_type: "CLAIM_DENIED",
      hearings: [
        hearing("2083-06-19", "आदेश", "कारण देखाउ आदेश"),
        hearing("2083-06-23", "फैसला", "रिट खारेज फाइल हेर्नुहोस्"),
      ],
    });
    expect(decision).toEqual({ outcome: "रिट खारेज", source: "court" });
  });

  it("falls back to the structured verdict when no sitting carries the text", () => {
    expect(caseDecision({ ...base, verdict_date_bs: "2072-04-25", verdict_type: "AFFIRMED" })).toEqual({
      outcome: "AFFIRMED",
      source: "verdict_type",
    });
    expect(VERDICT_LABELS.AFFIRMED.ne).toBe("सदर");
  });

  it("does not read an interlocutory अन्तिम आदेश on an undecided case as its decision", () => {
    const decision = caseDecision({
      ...base,
      case_status: "चलिरहेको",
      hearings: [hearing("2083-05-05", "अन्तिम आदेश", "कैफियत प्रतिवेदन माग्ने")],
    });
    expect(decision.outcome).toBeNull();
  });

  it("shows nothing for an uninformative verdict", () => {
    expect(caseDecision({ ...base, verdict_type: "OTHER" }).outcome).toBeNull();
    expect(caseDecision({ ...base, verdict_type: "PROCEDURAL" }).outcome).toBeNull();
  });
});

describe("caseIsDecided (status fallback)", () => {
  const base = { case_status: null, verdict_date_bs: null, verdict_type: null, hearings: [] };

  it("is decided on a verdict date, a classified verdict, or a sitting marked फैसला", () => {
    expect(caseIsDecided({ ...base, verdict_date_bs: "2083-04-22" })).toBe(true);
    expect(caseIsDecided({ ...base, verdict_type: "CLAIM_UPHELD" })).toBe(true);
    expect(caseIsDecided({ ...base, hearings: [hearing("2083-06-23", "फैसला", "रिट खारेज")] })).toBe(true);
  });

  it("is not decided on no evidence, or on an अन्तिम आदेश sitting alone", () => {
    expect(caseIsDecided(base)).toBe(false);
    expect(caseIsDecided({ ...base, hearings: [hearing("2083-05-05", "अन्तिम आदेश", "x")] })).toBe(false);
  });

  it("believes the register when it says the case is live", () => {
    expect(
      caseIsDecided({ ...base, case_status: "चलिरहेको", hearings: [hearing("2080-01-01", "फैसला", "x")] }),
    ).toBe(false);
  });
});
