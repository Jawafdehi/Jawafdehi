import { describe, it, expect, afterEach } from "vitest";
import { applyAnalyticsPathSuppression } from "./ga";
import { JAWAFDEHI_GA_MEASUREMENT_ID } from "@/config/analytics-config";

const DISABLE_KEY = `ga-disable-${JAWAFDEHI_GA_MEASUREMENT_ID}`;

function gaDisabled(): unknown {
  return (window as unknown as Record<string, unknown>)[DISABLE_KEY];
}

describe("applyAnalyticsPathSuppression", () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)[DISABLE_KEY];
  });

  it("sets gtag's opt-out flag on excluded (admin) routes", () => {
    applyAnalyticsPathSuppression("/admin/jawafdehi/cases");
    expect(gaDisabled()).toBe(true);
  });

  it("clears the opt-out flag on public routes", () => {
    applyAnalyticsPathSuppression("/admin/cases");
    expect(gaDisabled()).toBe(true);
    applyAnalyticsPathSuppression("/cases");
    expect(gaDisabled()).toBe(false);
  });
});
