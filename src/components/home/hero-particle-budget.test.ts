import { describe, expect, it } from "vitest";

import { heroParticleBudget } from "@/components/home/hero-particle-budget";

describe("heroParticleBudget", () => {
  it("gives capable desktops the full budget", () => {
    expect(heroParticleBudget(1440, 8, 8)).toBe(2600);
  });

  it("gives capable mobiles the mobile budget", () => {
    expect(heroParticleBudget(390, 8, 8)).toBe(1400);
  });

  it("halves the desktop budget when deviceMemory is at or below 4", () => {
    expect(heroParticleBudget(1440, 4, 8)).toBe(1300);
    expect(heroParticleBudget(1440, 2, 8)).toBe(1300);
  });

  it("halves the budget when hardwareConcurrency is at or below 4", () => {
    expect(heroParticleBudget(1440, 8, 4)).toBe(1300);
    expect(heroParticleBudget(390, 8, 2)).toBe(700);
  });

  it("halves when both signals are low (not quartered)", () => {
    expect(heroParticleBudget(1440, 4, 4)).toBe(1300);
  });

  it("treats missing signals as capable (Firefox/Safari expose no deviceMemory)", () => {
    expect(heroParticleBudget(1440, undefined, 8)).toBe(2600);
    expect(heroParticleBudget(1440, undefined, undefined)).toBe(2600);
  });

  it("uses the 768px breakpoint boundary", () => {
    expect(heroParticleBudget(767, 8, 8)).toBe(1400);
    expect(heroParticleBudget(768, 8, 8)).toBe(2600);
  });
});
