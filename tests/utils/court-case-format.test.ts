import { describe, expect, it } from "vitest";

import {
  courtStatusBadgeValue,
  courtTypeValue,
  formatCourtName,
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
