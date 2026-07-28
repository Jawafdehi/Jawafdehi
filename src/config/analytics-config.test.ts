import { describe, it, expect } from "vitest";
import { isAnalyticsExcludedPath } from "./analytics-config";

describe("isAnalyticsExcludedPath", () => {
  it("excludes the admin panel and its OIDC auth flows", () => {
    for (const p of [
      "/admin",
      "/admin/",
      "/admin/entities",
      "/admin/jawafdehi/cases",
      "/admin/login",
      "/admin/callback",
      "/admin/moderation",
    ]) {
      expect(isAnalyticsExcludedPath(p)).toBe(true);
    }
  });

  it("excludes the legacy paths that redirect into admin", () => {
    expect(isAnalyticsExcludedPath("/portal")).toBe(true);
    expect(isAnalyticsExcludedPath("/portal/reviews")).toBe(true);
    expect(isAnalyticsExcludedPath("/moderation")).toBe(true);
  });

  it("keeps public routes tracked", () => {
    for (const p of [
      "/",
      "/cases",
      "/case/some-slug",
      "/search",
      "/donate",
      "/donate/success",
      "/updates/a-post",
    ]) {
      expect(isAnalyticsExcludedPath(p)).toBe(false);
    }
  });

  it("does not treat a longer look-alike path as excluded", () => {
    // Prefix match must respect the segment boundary.
    expect(isAnalyticsExcludedPath("/administration")).toBe(false);
    expect(isAnalyticsExcludedPath("/portals")).toBe(false);
    expect(isAnalyticsExcludedPath("/moderation-guidelines")).toBe(false);
  });
});
