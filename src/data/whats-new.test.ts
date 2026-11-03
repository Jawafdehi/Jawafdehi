import { describe, expect, it } from "vitest";

import { SITE_ROUTES } from "@/data/site-routes";
import { WHATS_NEW, WHATS_NEW_UPDATED, entriesFor, tagsInUse } from "@/data/whats-new";

describe("the What's new changelog", () => {
  it("lists entries newest first, so the first one is the page's last-updated date", () => {
    const dates = WHATS_NEW.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(WHATS_NEW_UPDATED).toBe(dates[0]);
  });

  it("gives every entry a unique id, a real date, a tag, and both languages", () => {
    const ids = WHATS_NEW.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of WHATS_NEW) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
      expect(entry.tags.length).toBeGreaterThan(0);
      for (const text of [entry.title, entry.body]) {
        expect(text.en.trim()).not.toBe("");
        expect(text.ne.trim()).not.toBe("");
      }
    }
  });

  it("links only to routes the site serves", () => {
    const paths: string[] = SITE_ROUTES.map((route) => route.path);
    for (const { href } of WHATS_NEW) {
      if (!href || /^https?:\/\//.test(href)) continue;
      const path = href.split("?")[0];
      expect(paths).toContain(path);
    }
  });

  it("puts pinned entries first only when asked, and filters by tag", () => {
    const home = entriesFor({ limit: 2, pinnedFirst: true });
    expect(home[0].pinned).toBe(true);
    expect(entriesFor({ limit: 2 })[0]).toBe(WHATS_NEW[0]);
    expect(entriesFor({ tag: "mcp" }).every((entry) => entry.tags.includes("mcp"))).toBe(true);
  });

  it("offers a filter only for tags some entry carries", () => {
    for (const tag of tagsInUse()) {
      expect(WHATS_NEW.some((entry) => entry.tags.includes(tag))).toBe(true);
    }
  });
});
