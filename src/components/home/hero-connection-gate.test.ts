import { describe, expect, it } from "vitest";

import { heroSceneAffordable, readConnectionSignals } from "./hero-connection-gate";

describe("heroSceneAffordable", () => {
  it("allows when no signals are exposed (Safari/Firefox)", () => {
    expect(heroSceneAffordable({})).toBe(true);
  });

  it("blocks when Data Saver is on, regardless of everything else", () => {
    expect(heroSceneAffordable({ saveData: true, effectiveType: "4g", deviceMemory: 8 })).toBe(false);
  });

  it("blocks slow-2g, 2g and 3g connection classes", () => {
    for (const effectiveType of ["slow-2g", "2g", "3g"]) {
      expect(heroSceneAffordable({ effectiveType })).toBe(false);
    }
  });

  it("allows 4g", () => {
    expect(heroSceneAffordable({ effectiveType: "4g" })).toBe(true);
  });

  it("blocks low-memory devices (< 4 GiB bucket)", () => {
    expect(heroSceneAffordable({ deviceMemory: 2 })).toBe(false);
    expect(heroSceneAffordable({ deviceMemory: 0.5 })).toBe(false);
  });

  it("allows the 4 GiB bucket and above", () => {
    expect(heroSceneAffordable({ deviceMemory: 4 })).toBe(true);
    expect(heroSceneAffordable({ deviceMemory: 8 })).toBe(true);
  });

  it("does not treat saveData: false as a block", () => {
    expect(heroSceneAffordable({ saveData: false })).toBe(true);
  });
});

describe("readConnectionSignals", () => {
  it("returns undefined signals when the APIs are absent", () => {
    expect(readConnectionSignals({} as Navigator)).toEqual({
      saveData: undefined,
      effectiveType: undefined,
      deviceMemory: undefined,
    });
  });

  it("reads live values when exposed", () => {
    const nav = {
      connection: { saveData: true, effectiveType: "3g" },
      deviceMemory: 2,
    } as unknown as Navigator;
    expect(readConnectionSignals(nav)).toEqual({ saveData: true, effectiveType: "3g", deviceMemory: 2 });
  });
});
