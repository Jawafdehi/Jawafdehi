import { describe, expect, it } from "vitest";

import {
  courtStatusBadgeValue,
  courtStatusDisplay,
  courtTypeValue,
  formatCourtName,
  formatCourtType,
} from "@/utils/court-case-format";

describe("formatCourtName", () => {
  it("expands district and high court identifiers", () => {
    expect(formatCourtName("kanchanpurdc")).toBe(
      "Kanchanpur District Court",
    );
    expect(formatCourtName("butwalhc")).toBe("Butwal High Court");
  });

  it("formats the named national courts", () => {
    expect(formatCourtName("special")).toBe("Special Court");
    expect(formatCourtName("supreme", "ne")).toBe("सर्वोच्च अदालत");
  });
});

describe("formatCourtType", () => {
  // The four values `court_type` holds (JawafdehiAPI `ALL_COURT_TYPES`), which
  // is what the search sidebar's "Court level" group is built from.
  it.each([
    ["district", "District Court", "जिल्ला अदालत"],
    ["high", "High Court", "उच्च अदालत"],
    ["special", "Special Court", "विशेष अदालत"],
    ["supreme", "Supreme Court", "सर्वोच्च अदालत"],
  ] as const)("names the %s tier in both languages", (tier, en, ne) => {
    expect(formatCourtType(tier)).toBe(en);
    expect(formatCourtType(tier, "en")).toBe(en);
    expect(formatCourtType(tier, "ne")).toBe(ne);
  });

  // A TIER, not a court: "district" must not pick up a place name, and must not
  // be confused with the identifiers formatCourtName handles.
  it("is distinct from naming one court", () => {
    expect(formatCourtType("district")).toBe("District Court");
    expect(formatCourtName("kathmandudc")).toBe("Kathmandu District Court");
  });

  it("returns an empty label for nothing at all", () => {
    expect(formatCourtType(null)).toBe("");
    expect(formatCourtType(undefined)).toBe("");
    expect(formatCourtType("  ")).toBe("");
  });
});

describe("courtStatusBadgeValue", () => {
  it.each([
    ["फैसला भएको", "resolved"],
    ["closed", "resolved"],
    ["चालु", "ongoing"],
    ["pending", "ongoing"],
    ["unknown", "under-investigation"],
    [null, "under-investigation"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(courtStatusBadgeValue(status)).toBe(expected);
  });
});

describe("courtTypeValue", () => {
  it("prefers the court_type the API sends", () => {
    expect(courtTypeValue("kathmandudc", "district")).toBe("district");
    expect(courtTypeValue("special", "special")).toBe("special");
    // Case and padding as they may arrive from the index.
    expect(courtTypeValue("supreme", " SUPREME ")).toBe("supreme");
  });

  // The fallback path: `court_type` is missing on documents indexed before the
  // field existed, but the identifier suffix reproduces the tier for all 97
  // courts in GET /api/courts/.
  it.each([
    ["kanchanpurdc", "district"],
    ["kathmandudc", "district"],
    ["butwalhc", "high"],
    ["patanhc", "high"],
    ["special", "special"],
    ["specialcourt", "special"],
    ["supreme", "supreme"],
    ["supremecourt", "supreme"],
  ] as const)("derives %s as %s with no court_type", (court, expected) => {
    expect(courtTypeValue(court)).toBe(expected);
    expect(courtTypeValue(court, undefined)).toBe(expected);
    expect(courtTypeValue(court, null)).toBe(expected);
  });

  it("ignores a court_type outside the four-value vocabulary", () => {
    // A junk value must not win over a derivable identifier, and must not
    // leak through as a tier of its own.
    expect(courtTypeValue("butwalhc", "tribunal")).toBe("high");
    expect(courtTypeValue("butwalhc", "")).toBe("high");
    expect(courtTypeValue(null, "tribunal")).toBeNull();
  });

  it("returns null when the tier cannot be established", () => {
    expect(courtTypeValue(null)).toBeNull();
    expect(courtTypeValue(undefined)).toBeNull();
    expect(courtTypeValue("")).toBeNull();
    expect(courtTypeValue("   ")).toBeNull();
    // The retired appellate courts have no `court_type` value.
    expect(courtTypeValue("appellate")).toBeNull();
  });
});

/**
 * Every shape below was read off the live corpus (`court_cases`, 2,290,879
 * rows, 2026-10-14) rather than invented — the whole non-null vocabulary is
 * चालु, चलिरहेको, अन्तिम आदेश, and फैसला in three forms.
 */
describe("courtStatusDisplay", () => {
  const PENDING = { labelKey: "courtCaseDetail.status.pending", labelFallback: "Ongoing" };
  const DECIDED = { labelKey: "courtCaseDetail.status.decided", labelFallback: "Decided" };

  // The reviewer's actual complaint: two cards side by side, one reading चालु
  // and one चलिरहेको, look like two different states. They are one state.
  it("gives चालु and चलिरहेको the same label", () => {
    expect(courtStatusDisplay("चालु")).toEqual({ ...PENDING, detail: null });
    expect(courtStatusDisplay("चलिरहेको")).toEqual({ ...PENDING, detail: null });
  });

  it("keeps the outcome after the arrow, which is the finding itself", () => {
    expect(courtStatusDisplay("फैसला / अन्तिम आदेश >> अभियोग दाबी नपुग्ने")).toEqual({
      ...DECIDED,
      detail: "अभियोग दाबी नपुग्ने",
    });
    // A stray double space after the separator is in the data too.
    expect(courtStatusDisplay("फैसला / अन्तिम आदेश >>  अन्य")?.detail).toBeNull();
  });

  // 322 rows literally end ">> undefined". It must never reach a reader.
  it("drops the scraper's placeholder outcomes", () => {
    expect(courtStatusDisplay("फैसला / अन्तिम आदेश >> undefined")).toEqual({
      ...DECIDED,
      detail: null,
    });
  });

  it("shows a decision date, but only when it is really a date", () => {
    expect(courtStatusDisplay("फैसला (२०६७/०५/२८)")).toEqual({
      ...DECIDED,
      detail: "२०६७/०५/२८",
    });
    // All three are in the corpus: an all-zero date, a 42nd month, and a year
    // with a hyphen punched into it. A pill must not print any of them.
    expect(courtStatusDisplay("फैसला (००००/००/००)")?.detail).toBeNull();
    expect(courtStatusDisplay("फैसला (०७१०/४२/६)")?.detail).toBeNull();
    expect(courtStatusDisplay("फैसला (०७१-/०९/०६)")?.detail).toBeNull();
  });

  it("handles the bare decided forms", () => {
    expect(courtStatusDisplay("फैसला")).toEqual({ ...DECIDED, detail: null });
    expect(courtStatusDisplay("अन्तिम आदेश")).toEqual({ ...DECIDED, detail: null });
  });

  it("renders nothing at all for an absent status", () => {
    expect(courtStatusDisplay(null)).toBeNull();
    expect(courtStatusDisplay(undefined)).toBeNull();
    expect(courtStatusDisplay("   ")).toBeNull();
  });

  // The vocabulary is closed today, but the scraper feeds it. An unseen value
  // must degrade to showing itself, not disappear behind a wrong label.
  it("keeps an unrecognized status visible", () => {
    expect(courtStatusDisplay("कुनै नयाँ अवस्था")).toEqual({
      ...PENDING,
      detail: "कुनै नयाँ अवस्था",
    });
  });
});
