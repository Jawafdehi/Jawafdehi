import { describe, expect, it } from "vitest";

import deepak from "../../tests/fixtures/series/deepak-bhatta-affair.json";
import ncell from "../../tests/fixtures/series/ncell-tax-dispute.json";
import rabi from "../../tests/fixtures/series/rabi-lamichhane-cooperative-affair.json";
import {
  aboutLead,
  barLabelLayout,
  bsQuarterTicks,
  bsTickLabel,
  buildChartGroups,
  caseStatusLabelKey,
  chartDomain,
  courtCaseNumberFromIri,
  courtLabel,
  displayBsDate,
  formatSeriesBsDate,
  formatSeriesMoney,
  isCourtCaseDecided,
  materialPathFromIri,
  memberCourtCaseNumbers,
  parseAdDate,
  pickSeriesText,
  quarterStep,
  seriesCardOf,
  seriesNeighbours,
  seriesPath,
  seriesSlugFromUrl,
  statusCountEntries,
  timelineView,
  truncateLabel,
  validSeriesRefs,
  verdictLabelKey,
} from "@/lib/case-series";
import type { SeriesCourtCase, SeriesDetail } from "@/types/series";
import type { ArchiveSearchResult } from "@/types/search";

const DEEPAK = deepak as unknown as SeriesDetail;
const NCELL = ncell as unknown as SeriesDetail;
const RABI = rabi as unknown as SeriesDetail;
const TODAY = Date.UTC(2026, 10, 26);

describe("money", () => {
  it("formats बिगो in arab / crore / lakh with Nepali digits on ne", () => {
    expect(formatSeriesMoney(26_632_771_059, "ne")).toBe("रु. २६.६३ अर्ब");
    expect(formatSeriesMoney(115_700_000, "ne")).toBe("रु. ११.५७ करोड");
    expect(formatSeriesMoney(2_500_000, "ne")).toBe("रु. २५.०० लाख");
    expect(formatSeriesMoney(26_632_771_059, "en")).toBe("Rs 26.63 Arab");
  });

  it("shows a dash, never रु. ०, when there is no amount", () => {
    expect(formatSeriesMoney(null, "ne")).toBe("—");
    expect(formatSeriesMoney(0, "ne")).toBe("—");
    expect(formatSeriesMoney(undefined, "en")).toBe("—");
  });
});

describe("labels", () => {
  it("maps case statuses, falling back to unknown", () => {
    expect(caseStatusLabelKey("ongoing")).toBe("series.status.ongoing");
    expect(caseStatusLabelKey("under-investigation")).toBe("series.status.under_investigation");
    expect(caseStatusLabelKey("bogus")).toBe("series.status.unknown");
    expect(caseStatusLabelKey(null)).toBe("series.status.unknown");
  });

  it("maps verdict types and ignores unknown ones", () => {
    expect(verdictLabelKey("claim_upheld")).toBe("series.verdict.CLAIM_UPHELD");
    expect(verdictLabelKey("AFFIRMED")).toBeNull();
    expect(verdictLabelKey(null)).toBeNull();
  });

  it("orders status counts largest first and drops zeros", () => {
    expect(statusCountEntries({ closed: 1, ongoing: 4, others: 0 })).toEqual([
      ["ongoing", 4],
      ["closed", 1],
    ]);
  });

  it("picks the reader's script, falling back to the other", () => {
    expect(pickSeriesText({ ne: "दीपक भट्ट प्रकरण", en: "Deepak Bhatta Affair" }, "en")).toBe("Deepak Bhatta Affair");
    expect(pickSeriesText({ ne: "नेपाली मात्र", en: null }, "en")).toBe("नेपाली मात्र");
    expect(pickSeriesText(null, "ne")).toBe("");
  });

  it("names a court from the API, or derives it from the identifier", () => {
    const row = DEEPAK.court_cases[0];
    expect(courtLabel(row, "ne")).toBe("विशेष अदालत");
    expect(courtLabel({ ...row, court: "butwalhc", court_name: { ne: null, en: null } }, "en")).toBe("Butwal High Court");
  });
});

describe("court-case references", () => {
  it("reads the case number out of a court-case IRI", () => {
    expect(courtCaseNumberFromIri("https://jawafdehi.org/courtcase/special/082-cr-0154")).toBe("082-CR-0154");
    expect(courtCaseNumberFromIri("not an iri")).toBeNull();
    expect(memberCourtCaseNumbers(DEEPAK.members[0])).toEqual(["082-CR-0154"]);
  });

  it("decides a court case on a verdict date or type", () => {
    const base = DEEPAK.court_cases[0];
    expect(isCourtCaseDecided(base)).toBe(false);
    expect(isCourtCaseDecided({ ...base, verdict_type: "CLAIM_DENIED" })).toBe(true);
    expect(isCourtCaseDecided({ ...base, verdict_date_ad: "2026-01-01" })).toBe(true);
  });
});

describe("dates", () => {
  it("parses AD dates at UTC midnight", () => {
    expect(parseAdDate("2026-06-11")).toBe(Date.UTC(2026, 5, 11));
    expect(parseAdDate(null)).toBeNull();
    expect(parseAdDate("garbage")).toBeNull();
  });

  it("formats BS dates with Nepali numerals on ne and never takes an AD date for BS", () => {
    expect(formatSeriesBsDate("2083-02-28", "ne")).toBe("२०८३ जेष्ठ २८");
    expect(formatSeriesBsDate("2083-02-28", "en")).toBe("2083 जेष्ठ 28");
    expect(formatSeriesBsDate("2024-01-23", "ne")).toBe("");
    expect(displayBsDate(null, "2026-06-11", "ne")).toBe("२०८३ जेष्ठ २८");
  });
});

describe("chart rows", () => {
  it("gives every court case one row, grouped by court tier", () => {
    const groups = buildChartGroups(DEEPAK.court_cases, DEEPAK.members, "court", TODAY);
    expect(groups.flatMap((g) => g.rows)).toHaveLength(5);
    const tiers = groups.map((g) => g.courtCase.court_tier);
    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    expect(groups.every((g) => g.kind === "court")).toBe(true);
  });

  it("puts each court in exactly one group, district/special → High → Supreme", () => {
    const groups = buildChartGroups(RABI.court_cases, RABI.members, "court", TODAY);
    expect(groups.flatMap((g) => g.rows)).toHaveLength(24);
    const keys = groups.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
    const tiers = groups.map((g) => g.courtCase.court_tier);
    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    expect(tiers[tiers.length - 1]).toBe(3);
  });

  it("groups by member in member order when asked", () => {
    const groups = buildChartGroups(RABI.court_cases, RABI.members, "member", TODAY);
    const ordinals = groups.map((g) => g.member?.ordinal ?? 0);
    expect([...ordinals].sort((a, b) => a - b)).toEqual(ordinals);
    expect(groups.every((g) => g.kind === "member")).toBe(true);
    expect(groups.flatMap((g) => g.rows)).toHaveLength(24);
  });

  it("labels a member with no court case as the out-of-court group, last", () => {
    const groups = buildChartGroups(NCELL.court_cases, NCELL.members, "court", TODAY);
    expect(groups[groups.length - 1].kind).toBe("outOfCourt");
    expect(groups[groups.length - 1].rows).toHaveLength(1);
  });

  it("runs a pending row to today and a decided one to its verdict", () => {
    const pending: SeriesCourtCase = { ...DEEPAK.court_cases[0] };
    const decided: SeriesCourtCase = { ...pending, iri: "x", verdict_date_ad: "2026-08-01", verdict_type: "CLAIM_UPHELD" };
    const [group] = buildChartGroups([pending, decided], DEEPAK.members, "court", TODAY);
    expect(group.rows[0].end).toBe(TODAY);
    expect(group.rows[1].end).toBe(Date.UTC(2026, 7, 1));
    expect(group.rows[1].decided).toBe(true);
  });

  it("leaves out rows it cannot place on the time axis", () => {
    const undated = { ...DEEPAK.court_cases[0], registration_date_ad: null };
    expect(buildChartGroups([undated], DEEPAK.members, "court", TODAY)).toEqual([]);
  });
});

describe("chart axis", () => {
  it("pads the domain and spans to today", () => {
    const rows = buildChartGroups(DEEPAK.court_cases, DEEPAK.members, "court", TODAY).flatMap((g) => g.rows);
    const { lo, hi } = chartDomain(rows, TODAY);
    expect(lo).toBeLessThan(Math.min(...rows.map((r) => r.start)));
    expect(hi).toBeGreaterThan(TODAY);
  });

  it("thins ticks out as the span grows", () => {
    expect(quarterStep(0.5)).toBe(1);
    expect(quarterStep(3)).toBe(2);
    expect(quarterStep(8)).toBe(4);
  });

  it("puts BS quarter ticks on the real first day of बैशाख, श्रावण, कार्तिक and माघ", () => {
    const ticks = bsQuarterTicks(Date.UTC(2026, 0, 1), Date.UTC(2026, 11, 31), 1);
    expect(ticks.map((t) => [t.bsYear, t.bsMonth])).toEqual([
      [2082, 10],
      [2083, 1],
      [2083, 4],
      [2083, 7],
    ]);
    // बैशाख 1, 2083 = 14 April 2026.
    expect(ticks[1].time).toBe(Date.UTC(2026, 3, 14));
    expect(bsTickLabel(ticks[1], "ne")).toBe("बैशाख २०८३");
    expect(bsQuarterTicks(Date.UTC(2026, 0, 1), Date.UTC(2026, 11, 31), 4).map((t) => t.bsMonth)).toEqual([1]);
  });
});

describe("bar labels", () => {
  it("keeps the first clause of the about text", () => {
    expect(aboutLead("मुख्य मुद्दा: विशेष अदालतमा ३९ प्रतिवादी")).toBe("मुख्य मुद्दा");
    expect(aboutLead("एउटा वाक्य। अर्को वाक्य।")).toBe("एउटा वाक्य");
    expect(aboutLead(null)).toBe("");
  });

  it("truncates by character with an ellipsis", () => {
    expect(truncateLabel("abcdef", 10)).toBe("abcdef");
    expect(truncateLabel("abcdefghijk", 5)).toBe("abcd…");
    expect(truncateLabel("abc", 1)).toBe("…");
  });

  it("anchors a late bar's label to its end and sizes the room to fit", () => {
    expect(barLabelLayout({ x: 200, x2: 300, width: 900, labelColumn: 190, caseNumberLength: 11 })).toEqual({
      anchorEnd: false,
      room: Math.floor((900 - 200 - 30) / 6.2) - 11,
    });
    const late = barLabelLayout({ x: 800, x2: 870, width: 900, labelColumn: 190, caseNumberLength: 11 });
    expect(late.anchorEnd).toBe(true);
    expect(late.room).toBeGreaterThanOrEqual(10);
  });
});

describe("merged timeline", () => {
  it("shows the latest eight and keeps the older ones for print", () => {
    const view = timelineView(DEEPAK.timeline, null, false);
    const count = (items: typeof view.visible) => items.filter((i) => i.kind === "event").length;
    expect(view.total).toBe(DEEPAK.timeline.length);
    expect(count(view.visible)).toBe(8);
    expect(count(view.earlier)).toBe(DEEPAK.timeline.length - 8);
    expect(view.visible[0].kind).toBe("year");
  });

  it("shows everything with showAll, and filters by member", () => {
    const all = timelineView(DEEPAK.timeline, null, true);
    expect(all.earlier).toEqual([]);
    const slug = DEEPAK.members[0].case.slug;
    const one = timelineView(DEEPAK.timeline, slug, true);
    expect(one.total).toBe(DEEPAK.timeline.filter((e) => e.member_slug === slug).length);
  });

  it("starts a new year header when the BS year changes", () => {
    const { visible } = timelineView(
      [
        { date: "2025-01-01", date_bs: "2081-09-17", title: "a" },
        { date: "2025-02-01", date_bs: "2081-10-19", title: "b" },
        { date: "2025-05-01", date_bs: "2082-01-18", title: "c" },
      ],
      null,
      true,
    );
    expect(visible.map((i) => (i.kind === "year" ? `Y${i.year}` : i.event.title))).toEqual(["Y2081", "a", "b", "Y2082", "c"]);
  });
});

describe("case banner neighbours", () => {
  it("finds the previous and next members", () => {
    const n = seriesNeighbours(DEEPAK, "cib-463");
    expect(n?.member.ordinal).toBe(3);
    expect(n?.prev?.ordinal).toBe(2);
    expect(n?.next?.ordinal).toBe(4);
    expect(seriesNeighbours(DEEPAK, DEEPAK.members[0].case.slug)?.prev).toBeNull();
    expect(seriesNeighbours(DEEPAK, "not-a-member")).toBeNull();
  });

  it("drops malformed series refs", () => {
    expect(
      validSeriesRefs([
        { slug: "a", title: { ne: "क", en: null }, ordinal: 1, member_count: 2 },
        { slug: "", title: { ne: "ख", en: null }, ordinal: 1, member_count: 2 },
        { slug: "c", title: { ne: null, en: null }, ordinal: 1, member_count: 2 },
      ]).map((r) => r.slug),
    ).toEqual(["a"]);
    expect(validSeriesRefs(undefined)).toEqual([]);
  });
});

describe("paths and search cards", () => {
  it("builds slashed series paths and material paths", () => {
    expect(seriesPath("deepak-bhatta-affair")).toBe("/series/deepak-bhatta-affair/");
    expect(materialPathFromIri("https://jawafdehi.org/material/ag/115677")).toBe("/material/ag/115677");
    expect(materialPathFromIri("https://example.org/other")).toBeNull();
    expect(seriesSlugFromUrl("/series/deepak-bhatta-affair/")).toBe("deepak-bhatta-affair");
  });

  it("reads a series card only off a series hit with the right shape", () => {
    const card = { slug: "s", title: { ne: "क", en: null }, summary: { ne: null, en: null }, totals: DEEPAK.totals, members: [] };
    const hit = { type: "series", card } as unknown as ArchiveSearchResult;
    expect(seriesCardOf(hit)?.slug).toBe("s");
    expect(seriesCardOf({ ...hit, type: "case" })).toBeNull();
    expect(seriesCardOf({ ...hit, card: { slug: "s" } } as unknown as ArchiveSearchResult)).toBeNull();
  });
});
