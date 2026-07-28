import { describe, it, expect, afterEach, vi } from "vitest";
import { applyAnalyticsPathSuppression } from "./ga";
import { JAWAFDEHI_GA_MEASUREMENT_ID } from "@/config/analytics-config";

// Force the host/env gate open so loadGoogleAnalytics reaches its path check
// (jsdom would otherwise look like an allowed prod host, but be explicit).
vi.mock("./telemetry", () => ({
  telemetryAllowedHere: () => true,
  isCloudflarePreviewHost: () => false,
}));

const DISABLE_KEY = `ga-disable-${JAWAFDEHI_GA_MEASUREMENT_ID}`;
const win = () => window as unknown as Record<string, unknown>;
const gaDisabled = () => win()[DISABLE_KEY];

const gaScripts = () =>
  Array.from(document.querySelectorAll("script")).filter((s) =>
    s.src.includes("googletagmanager.com/gtag/js"),
  );

afterEach(() => {
  gaScripts().forEach((s) => s.remove());
  delete win().gtag;
  delete win().dataLayer;
  delete win()[DISABLE_KEY];
  window.history.replaceState({}, "", "/");
  vi.resetModules();
});

describe("applyAnalyticsPathSuppression", () => {
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

describe("loadGoogleAnalytics (entry-route gate)", () => {
  it("does NOT fetch gtag.js when the entry route is under /admin", async () => {
    window.history.replaceState({}, "", "/admin/entities");
    const { loadGoogleAnalytics } = await import("./ga");

    loadGoogleAnalytics();

    expect(gaScripts()).toHaveLength(0);
    expect(win().gtag).toBeUndefined();
  });

  it("fetches gtag.js on a public route and leaves analytics active", async () => {
    window.history.replaceState({}, "", "/cases");
    const { loadGoogleAnalytics } = await import("./ga");

    loadGoogleAnalytics();

    expect(gaScripts()).toHaveLength(1);
    expect(typeof win().gtag).toBe("function");
    expect(gaDisabled()).toBe(false);
  });
});
