import { describe, it, expect } from "vitest";
import { personSectorKey, rollupToCoarse } from "./person-sector-labels";

describe("personSectorKey", () => {
  it("maps snake-case sector tokens to camelCase i18n key suffixes", () => {
    expect(personSectorKey("civil_service")).toBe("civilService");
    expect(personSectorKey("local_gov")).toBe("localGov");
    expect(personSectorKey("not_recorded")).toBe("notRecorded");
    expect(personSectorKey("politicians")).toBe("politicians");
  });
});

describe("rollupToCoarse", () => {
  it("rolls detailed sectors into public / private / other, summing counts", () => {
    const coarse = rollupToCoarse([
      { sector: "politicians", count: 5 },
      { sector: "civil_service", count: 3 },
      { sector: "local_gov", count: 2 },
      { sector: "business", count: 4 },
      { sector: "not_recorded", count: 6 },
      { sector: "other", count: 1 },
    ]);
    const by = Object.fromEntries(coarse.map((c) => [c.sector, c.count]));
    expect(by.public).toBe(10); // 5 + 3 + 2
    expect(by.private).toBe(4);
    expect(by.other).toBe(7); // 6 + 1
  });

  it("orders public, private, other and drops empty buckets", () => {
    const coarse = rollupToCoarse([{ sector: "business", count: 4 }]);
    expect(coarse.map((c) => c.sector)).toEqual(["private"]);
  });
});
