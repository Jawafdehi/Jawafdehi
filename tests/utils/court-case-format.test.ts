import { describe, expect, it } from "vitest";

import {
  courtStatusBadgeValue,
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
