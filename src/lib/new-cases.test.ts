import { describe, expect, it, vi } from "vitest";

import {
  addDays,
  buildWeekView,
  caseTitleFor,
  courtChip,
  cutoffFor,
  feedUrls,
  fetchPublishedSince,
  formatCount,
  formatRowDate,
  formatWeekAD,
  formatWeekBS,
  groupCasesByWeek,
  hasCaseBefore,
  nepalToday,
  nextPageNumber,
  publishDate,
  recentWeeks,
  sortByPublishDateDesc,
  weekStartOf,
  weeksAgo,
  weeksToFetch,
} from "@/lib/new-cases";
import type { Case, PaginatedCaseList } from "@/types/jds";

const item = (id: number, case_publish_date: string | null, extra: Partial<Case> = {}) =>
  ({ id, case_publish_date, title: `मुद्दा ${id}`, ...extra }) as Case;

describe("dates", () => {
  it("reads the date part of a publish date and rejects junk", () => {
    expect(publishDate("2026-11-24")).toBe("2026-11-24");
    expect(publishDate("2026-11-24T10:00:00Z")).toBe("2026-11-24");
    expect(publishDate(null)).toBeNull();
    expect(publishDate("")).toBeNull();
    expect(publishDate("2026-02-31")).toBeNull();
    expect(publishDate("२०८३-०८-०८")).toBeNull();
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("takes today's date in Nepal, not in UTC", () => {
    // 20:00 UTC on Thursday is already 01:45 on Friday in Kathmandu.
    expect(nepalToday(new Date("2026-11-26T20:00:00Z"))).toBe("2026-11-27");
    expect(nepalToday(new Date("2026-11-26T18:14:00Z"))).toBe("2026-11-26");
    expect(nepalToday(new Date("2026-11-26T18:15:00Z"))).toBe("2026-11-27");
  });
});

describe("digest weeks run Friday to Thursday", () => {
  it.each([
    ["2026-11-20", "2026-11-20"], // Friday starts a week
    ["2026-11-24", "2026-11-20"], // Tuesday
    ["2026-11-26", "2026-11-20"], // Thursday, digest day, ends it
    ["2026-11-27", "2026-11-27"], // next Friday
    ["2027-01-01", "2027-01-01"], // a Friday across the year end
    ["2026-12-31", "2026-12-25"],
  ])("%s falls in the week starting %s", (day, start) => {
    expect(weekStartOf(day)).toBe(start);
  });

  it("lists the recent weeks newest first, the current one included", () => {
    expect(recentWeeks("2026-11-26", 3)).toEqual([
      { start: "2026-11-20", end: "2026-11-26" },
      { start: "2026-11-13", end: "2026-11-19" },
      { start: "2026-11-06", end: "2026-11-12" },
    ]);
    expect(recentWeeks("2026-11-26", 0)).toEqual([]);
  });

  it("cuts off at the oldest week's Friday", () => {
    expect(cutoffFor("2026-11-26", 1)).toBe("2026-11-20");
    expect(cutoffFor("2026-11-26", 8)).toBe("2026-10-02");
  });
});

describe("groupCasesByWeek", () => {
  it("groups by week, newest first, keeps quiet weeks and drops the rest", () => {
    const cases = [
      item(1, "2026-11-24"),
      item(2, "2026-11-26"),
      item(3, "2026-11-19"),
      item(4, null),
      item(5, "2026-10-01"), // before the window
      item(6, "2026-11-24"),
    ];
    const groups = groupCasesByWeek(cases, "2026-11-26", 3);
    expect(groups.map((g) => [g.start, g.cases.map((c) => c.id)])).toEqual([
      ["2026-11-20", [2, 6, 1]],
      ["2026-11-13", [3]],
      ["2026-11-06", []],
    ]);
  });
});

describe("buildWeekView: an empty current week is hidden", () => {
  // Thursday 26 Nov 2026: the current week is 20–26 Nov.
  const today = "2026-11-26";
  const starts = (view: { groups: { start: string }[] }) => view.groups.map((g) => g.start);

  it("fetches one spare week", () => {
    expect(weeksToFetch(8)).toBe(9);
    expect(weeksToFetch(0)).toBe(2);
  });

  it("hides the current week when it has no cases and opens on last week", () => {
    const view = buildWeekView([item(1, "2026-11-19"), item(2, "2026-09-26")], today, 3, false);
    expect(starts(view)).toEqual(["2026-11-13", "2026-11-06", "2026-10-30"]);
    expect(view.groups[0].cases.map((c) => c.id)).toEqual([1]);
    // A fetched case older than the window still offers "show older weeks".
    expect(view.hasOlder).toBe(true);
  });

  it("hides it on Friday morning too, when the week has only just begun", () => {
    const view = buildWeekView([item(1, "2026-11-26")], "2026-11-27", 2, false);
    expect(starts(view)).toEqual(["2026-11-20", "2026-11-13"]);
    expect(view.hasOlder).toBe(false);
  });

  it("shows the current week when it has cases", () => {
    const view = buildWeekView([item(1, "2026-11-24"), item(2, "2026-11-12")], today, 3, false);
    expect(starts(view)).toEqual(["2026-11-20", "2026-11-13", "2026-11-06"]);
    expect(view.groups.map((g) => g.cases.map((c) => c.id))).toEqual([[1], [], [2]]);
    expect(view.hasOlder).toBe(false);
  });

  it("counts a case in the unused spare week as older", () => {
    const view = buildWeekView([item(1, "2026-11-24"), item(2, "2026-10-31")], today, 3, false);
    expect(starts(view)).toEqual(["2026-11-20", "2026-11-13", "2026-11-06"]);
    expect(view.hasOlder).toBe(true);
  });

  it("keeps an empty past week, unchanged", () => {
    const view = buildWeekView([item(1, "2026-11-24"), item(2, "2026-11-06")], today, 3, false);
    expect(view.groups[1]).toEqual({ start: "2026-11-13", end: "2026-11-19", cases: [] });
    // With the current week hidden, an empty last week still opens the page.
    const quiet = buildWeekView([item(2, "2026-11-06")], today, 3, true);
    expect(starts(quiet)).toEqual(["2026-11-13", "2026-11-06", "2026-10-30"]);
    expect(quiet.groups[0].cases).toEqual([]);
    expect(quiet.hasOlder).toBe(true);
  });

  it("names a week by how long ago it was, not by its place on the page", () => {
    expect(weeksAgo("2026-11-20", today)).toBe(0);
    expect(weeksAgo("2026-11-13", today)).toBe(1);
    expect(weeksAgo("2026-10-30", today)).toBe(3);
  });
});

describe("sortByPublishDateDesc", () => {
  it("puts the newest first and undated cases last, whatever order the API used", () => {
    const sorted = sortByPublishDateDesc([item(1, null), item(2, "2026-10-01"), item(3, "2026-11-24")]);
    expect(sorted.map((c) => c.id)).toEqual([3, 2, 1]);
  });
});

describe("fetchPublishedSince", () => {
  const page = (results: Case[], next: number | null): PaginatedCaseList => ({
    count: 0,
    previous: null,
    next: next ? `https://api.jawafdehi.org/api/cases/?page=${next}&page_size=100` : null,
    results,
  });

  it("follows next to the end, past pages of old cases (creation-date order)", async () => {
    // An API that ignores the params: page 2 is all old, page 3 still has a
    // case published this week.
    const pages: Record<number, PaginatedCaseList> = {
      1: page([item(1, "2026-10-01"), item(2, "2026-11-24")], 2),
      2: page([item(3, "2026-09-01"), item(9, null)], 3),
      3: page([item(4, "2026-11-25")], null),
    };
    const fetchPage = vi.fn((n: number) => Promise.resolve(pages[n]));
    const result = await fetchPublishedSince(fetchPage, "2026-11-20");
    expect(fetchPage.mock.calls.map(([n]) => n)).toEqual([1, 2, 3]);
    expect(result.cases.map((c) => c.id)).toEqual([4, 2]);
    expect(result.hasOlder).toBe(true);
  });

  it("asks the probe about older cases when the API filtered them all out", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(page([item(1, "2026-11-26"), item(2, "2026-11-21")], null)));
    const probe = vi.fn(() => Promise.resolve(true));
    const result = await fetchPublishedSince(fetchPage, "2026-11-20", 10, probe);
    expect(probe).toHaveBeenCalledOnce();
    expect(result.hasOlder).toBe(true);

    expect((await fetchPublishedSince(fetchPage, "2026-11-20", 10, () => Promise.resolve(false))).hasOlder).toBe(false);
    // A failing probe offers the button rather than failing the page.
    expect(
      (await fetchPublishedSince(fetchPage, "2026-11-20", 10, () => Promise.reject(new Error("429")))).hasOlder,
    ).toBe(true);
  });

  it("skips the probe when the pages already showed older cases", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(page([item(1, "2026-11-26"), item(2, "2026-01-01")], null)));
    const probe = vi.fn(() => Promise.resolve(false));
    expect((await fetchPublishedSince(fetchPage, "2026-11-20", 10, probe)).hasOlder).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it("reads a probe response by publish date, not by its presence", () => {
    expect(hasCaseBefore(page([item(1, "2026-11-19")], null), "2026-11-20")).toBe(true);
    // An API that ignored published_before hands back a current case.
    expect(hasCaseBefore(page([item(1, "2026-11-24")], null), "2026-11-20")).toBe(false);
    expect(hasCaseBefore(page([item(1, null)], null), "2026-11-20")).toBe(false);
    expect(hasCaseBefore(page([], null), "2026-11-20")).toBe(false);
  });

  it("works when the API ignores the ordering: sorts and filters itself", async () => {
    const fetchPage = vi.fn(() =>
      Promise.resolve(page([item(1, "2026-11-21"), item(2, null), item(3, "2026-11-26")], null)),
    );
    const result = await fetchPublishedSince(fetchPage, "2026-11-20");
    expect(result.cases.map((c) => c.id)).toEqual([3, 1]);
    expect(result.hasOlder).toBe(true);
  });

  it("says there is nothing older when the API ran out inside the window", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(page([item(1, "2026-11-21")], null)));
    expect((await fetchPublishedSince(fetchPage, "2026-11-20")).hasOlder).toBe(false);
  });

  it("gives up after the page cap and de-duplicates repeats", async () => {
    const fetchPage = vi.fn((n: number) => Promise.resolve(page([item(1, "2026-11-21")], n + 1)));
    const result = await fetchPublishedSince(fetchPage, "2026-11-20", 3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(result.cases).toHaveLength(1);
    expect(result.hasOlder).toBe(true);
  });

  it("reads the page number out of a next link", () => {
    expect(nextPageNumber("https://api.jawafdehi.org/api/cases/?ordering=x&page=7")).toBe(7);
    expect(nextPageNumber("/api/cases/?page=2")).toBe(2);
    expect(nextPageNumber(null)).toBeNull();
    expect(nextPageNumber("https://api.jawafdehi.org/api/cases/")).toBeNull();
  });
});

describe("labels", () => {
  it("names a week in BS with Nepali numerals", () => {
    // 2026-11-20 is 2083 Mangsir 4; 2026-11-26 is Mangsir 10.
    expect(formatWeekBS({ start: "2026-11-20", end: "2026-11-26" })).toBe("२०८३ मंसिर ४–१०");
    // Across a month boundary.
    expect(formatWeekBS({ start: "2026-11-13", end: "2026-11-19" })).toMatch(/^२०८३ कार्तिक २७ – मंसिर ३$/);
  });

  it("names a week in AD", () => {
    expect(formatWeekAD({ start: "2026-11-20", end: "2026-11-26" })).toBe("20–26 Nov 2026");
    expect(formatWeekAD({ start: "2026-11-27", end: "2026-12-03" })).toBe("27 Nov – 3 Dec 2026");
    expect(formatWeekAD({ start: "2026-12-25", end: "2026-12-31" })).toBe("25–31 Dec 2026");
    expect(formatWeekAD({ start: "2027-12-31", end: "2028-01-06" })).toBe("31 Dec 2027 – 6 Jan 2028");
  });

  it("dates a row in the reader's calendar", () => {
    expect(formatRowDate("2026-11-24", "ne")).toBe("मंसिर ८");
    expect(formatRowDate("2026-11-24", "en")).toBe("24 Nov");
  });

  it("counts in the reader's numerals", () => {
    expect(formatCount(71, "ne")).toBe("७१");
    expect(formatCount(71, "en")).toBe("71");
  });

  it("uses the English title in English, falling back to the Nepali one", () => {
    expect(caseTitleFor({ title: "नेपाली", title_en: "English" }, "en")).toBe("English");
    expect(caseTitleFor({ title: "नेपाली", title_en: "  " }, "en")).toBe("नेपाली");
    expect(caseTitleFor({ title: "नेपाली", title_en: null }, "en")).toBe("नेपाली");
    expect(caseTitleFor({ title: "नेपाली", title_en: "English" }, "ne")).toBe("नेपाली");
  });

  it("turns a court-case IRI into a linked chip with the court's name", () => {
    expect(courtChip("https://jawafdehi.org/courtcase/special/083-cr-0063", "ne")).toEqual({
      key: "special/083-cr-0063",
      href: "/courtcase/special/083-cr-0063",
      label: "083-CR-0063 · विशेष अदालत",
    });
    expect(courtChip("https://jawafdehi.org/courtcase/kathmandudc/081-c1-0001", "en")?.label).toBe(
      "081-C1-0001 · District Court Kathmandu",
    );
    expect(courtChip("special:083-CR-0063", "en")).toBeNull();
  });
});

describe("feedUrls", () => {
  it("asks for English titles on the English page", () => {
    expect(feedUrls("ne")).toEqual({
      rss: "https://api.jawafdehi.org/api/feeds/new-cases.rss",
      atom: "https://api.jawafdehi.org/api/feeds/new-cases.atom",
    });
    expect(feedUrls("en").rss).toBe("https://api.jawafdehi.org/api/feeds/new-cases.rss?lang=en");
  });
});
