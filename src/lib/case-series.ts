/**
 * Case series, as data: the rules behind the series page, its court-case
 * timeline chart, the search card and the case page's series banner.
 * Components only render what this returns.
 *
 * Contract: JawafdehiAPI `GET /api/series/<slug>/` (see src/types/series.ts).
 */
import bs from "bikram-sambat";

import type { ArchiveSearchResult } from "@/types/search";
import type {
  CaseSeriesRef,
  SeriesCourtCase,
  SeriesDetail,
  SeriesMember,
  SeriesSearchCard,
  SeriesText,
  SeriesTimelineEvent,
} from "@/types/series";
import { adStringToBSString, NEPALI_MONTHS } from "@/utils/bs-calendar";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import { formatCourtName } from "@/utils/court-case-format";
import { formatBigo, localiseNumber } from "@/utils/number";

// ---------------------------------------------------------------------------
// Text, numbers, money
// ---------------------------------------------------------------------------

/** The reader's language first, then the other script; "" when both are empty. */
export function pickSeriesText(text: SeriesText | null | undefined, language: string): string {
  if (!text) return "";
  const nepali = language.startsWith("ne");
  return ((nepali ? text.ne || text.en : text.en || text.ne) ?? "").trim();
}

/** A number or a digit-bearing string in the reader's digits (Devanagari on ne). */
export function localDigits(value: number | string, language: string): string {
  return localiseNumber(String(value), language);
}

/**
 * A बिगो amount in lakh / crore / arab units, or an em dash when there is
 * none. The units and digits come from the site's one money formatter
 * (`formatBigo`), so a series figure reads exactly like the same figure on
 * the case page. Never sum member amounts with this: members' claims overlap.
 */
export function formatSeriesMoney(amount: number | null | undefined, language: string): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return "—";
  return formatBigo(amount, language);
}

/** "082-CR-0154" from a court-case IRI, or null when it is not one. */
export function courtCaseNumberFromIri(iri: string | null | undefined): string | null {
  const parts = parseCourtCaseRef(iri);
  return parts ? parts.caseNumber.toUpperCase() : null;
}

/** The member's court-case numbers, in the case's own order. */
export function memberCourtCaseNumbers(member: SeriesMember): string[] {
  return (member.case.court_cases ?? [])
    .map(courtCaseNumberFromIri)
    .filter((value): value is string => Boolean(value));
}

export function membersBySlug(members: readonly SeriesMember[]): Map<string, SeriesMember> {
  return new Map(members.map((member) => [member.case.slug, member]));
}

// ---------------------------------------------------------------------------
// Status and verdict labels
// ---------------------------------------------------------------------------

const CASE_STATUSES = [
  "ongoing",
  "under_investigation",
  "concluded",
  "closed",
  "others",
  "withdrawn",
  "dormant",
] as const;

/** i18n key for a member case's status; unknown values get the "unknown" label. */
export function caseStatusLabelKey(status: string | null | undefined): string {
  const value = (status ?? "").trim().toLowerCase().replace(/-/g, "_");
  const known = CASE_STATUSES.find((s) => s === value);
  return `series.status.${known ?? "unknown"}`;
}

/** The status counts, largest first, so the summary leads with the common state. */
export function statusCountEntries(counts: Record<string, number> | null | undefined): Array<[string, number]> {
  return Object.entries(counts ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const VERDICT_TYPES = [
  "CLAIM_UPHELD",
  "PARTIALLY_UPHELD",
  "CLAIM_DENIED",
  "REVERSED",
  "PROCEDURAL",
  "DECIDED",
] as const;

/** i18n key for a court verdict type, or null when it is absent or unknown. */
export function verdictLabelKey(verdict: string | null | undefined): string | null {
  const value = (verdict ?? "").trim().toUpperCase();
  const known = VERDICT_TYPES.find((v) => v === value);
  return known ? `series.verdict.${known}` : null;
}

/** A court case is decided once it has a verdict date or a verdict type. */
export function isCourtCaseDecided(courtCase: SeriesCourtCase): boolean {
  return Boolean(courtCase.verdict_date_ad || courtCase.verdict_type);
}

/** Tier 4: a member's proceedings outside any court (no court-case number). */
export function isOutOfCourt(courtCase: SeriesCourtCase): boolean {
  return courtCase.court_tier === 4 || (!courtCase.court && !courtCase.case_number);
}

/** The court's name in the reader's language, from the API or derived from its identifier. */
export function courtLabel(courtCase: SeriesCourtCase, language: string): string {
  return pickSeriesText(courtCase.court_name, language) || formatCourtName(courtCase.court, language);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

/** "YYYY-MM-DD" (AD) as a UTC timestamp, or null. UTC so no reader's timezone shifts a day. */
export function parseAdDate(value: string | null | undefined): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(time) ? null : time;
}

/** Today at UTC midnight, the chart's right edge for every pending case. */
export function utcToday(now: Date = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** A BS "YYYY-MM-DD" as "२०८३ जेष्ठ २८" on ne, "2083 जेष्ठ 28" on en; "" when unparseable. */
export function formatSeriesBsDate(bsDate: string | null | undefined, language: string): string {
  const match = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec((bsDate ?? "").trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  // BS only from 2040: an AD "2024-01-23" must never pass for a BS date.
  if (year < 2040 || month < 1 || month > 12) return "";
  const parts = [String(year), NEPALI_MONTHS[month - 1]];
  if (match[3]) parts.push(String(Number(match[3])));
  return localDigits(parts.join(" "), language);
}

/** A court record's date in BS: its own BS date, else the AD date converted; "" when neither parses. */
export function displayBsDate(
  bsDate: string | null | undefined,
  adDate: string | null | undefined,
  language: string,
): string {
  return formatSeriesBsDate(bsDate, language) || formatSeriesBsDate(adStringToBSString(adDate), language);
}

/** The BS date to show for an event: its own `date_bs`, else its AD date converted. */
export function eventBsDate(event: Pick<SeriesTimelineEvent, "date" | "date_bs">): string | null {
  return event.date_bs || adStringToBSString(event.date);
}

// ---------------------------------------------------------------------------
// Court-case timeline chart
// ---------------------------------------------------------------------------

export type ChartGroupBy = "court" | "member";

export interface ChartRow {
  courtCase: SeriesCourtCase;
  member: SeriesMember | undefined;
  start: number;
  /**
   * The verdict date; today while the case is pending; and the start itself
   * for a case decided on an unrecorded date, so the chart never presents
   * today as its verdict date.
   */
  end: number;
  decided: boolean;
  /** False for a decided case whose verdict date is not recorded. */
  verdictDateKnown: boolean;
}

export interface ChartGroup {
  key: string;
  /** What the shaded label column names: a court, the out-of-court process, or a member case. */
  kind: "court" | "outOfCourt" | "member";
  courtCase: SeriesCourtCase;
  member: SeriesMember | undefined;
  rows: ChartRow[];
}

const OUT_OF_COURT_KEY = "__out_of_court__";
const NO_ORDINAL = Number.MAX_SAFE_INTEGER;

/**
 * One row per court case, grouped and ordered for the chart.
 *
 * By court: district/special → High → Supreme → out-of-court, then member
 * order, then registration date; one group per court. By member: member order,
 * then tier, then date; one group per member case. Rows with no registration
 * date cannot be placed on a time axis and are left out.
 */
export function buildChartGroups(
  courtCases: readonly SeriesCourtCase[],
  members: readonly SeriesMember[],
  groupBy: ChartGroupBy,
  today: number,
): ChartGroup[] {
  const bySlug = membersBySlug(members);
  const ordinal = (c: SeriesCourtCase) => bySlug.get(c.member_slug)?.ordinal ?? NO_ORDINAL;
  const rows: ChartRow[] = [];
  for (const courtCase of courtCases) {
    const start = parseAdDate(courtCase.registration_date_ad);
    if (start == null) continue;
    const verdict = parseAdDate(courtCase.verdict_date_ad);
    const decided = isCourtCaseDecided(courtCase);
    const pendingEnd = decided ? start : today;
    rows.push({
      courtCase,
      member: bySlug.get(courtCase.member_slug),
      start,
      end: Math.max(verdict ?? pendingEnd, start),
      decided,
      verdictDateKnown: verdict != null,
    });
  }

  const tier = (c: SeriesCourtCase) => (isOutOfCourt(c) ? 4 : c.court_tier || 4);
  rows.sort((a, b) => {
    const byTier = tier(a.courtCase) - tier(b.courtCase);
    const byMember = ordinal(a.courtCase) - ordinal(b.courtCase);
    const byDate = a.start - b.start;
    return groupBy === "court" ? byTier || byMember || byDate : byMember || byTier || byDate;
  });

  const groups = new Map<string, ChartGroup>();
  for (const row of rows) {
    const c = row.courtCase;
    const key =
      groupBy === "member"
        ? `member:${c.member_slug}`
        : isOutOfCourt(c)
          ? OUT_OF_COURT_KEY
          : `court:${c.court || c.court_name?.ne || c.court_name?.en || ""}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        kind: groupBy === "member" ? "member" : isOutOfCourt(c) ? "outOfCourt" : "court",
        courtCase: c,
        member: row.member,
        rows: [],
      };
      groups.set(key, group);
    }
    group.rows.push(row);
  }
  return [...groups.values()];
}

/**
 * The time axis: from a little before the first registration to a month past
 * today or the last verdict, whichever is later.
 */
export function chartDomain(rows: readonly ChartRow[], today: number): { lo: number; hi: number; spanYears: number } {
  if (rows.length === 0) return { lo: today - YEAR_MS, hi: today + 30 * DAY_MS, spanYears: 1 };
  const first = Math.min(...rows.map((r) => r.start));
  const last = Math.max(today, ...rows.map((r) => r.end));
  const spanYears = (last - first) / YEAR_MS;
  const lo = new Date(first);
  const hi = new Date(last);
  const padMonths = spanYears < 1 ? 1 : 3;
  return {
    lo: Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth() - padMonths, 1),
    hi: Date.UTC(hi.getUTCFullYear(), hi.getUTCMonth() + 1, 28),
    spanYears,
  };
}

/** Quarters between ticks: every quarter under 2 years, half-years to 5, then years. */
export function quarterStep(spanYears: number): 1 | 2 | 4 {
  if (spanYears > 5) return 4;
  if (spanYears > 2) return 2;
  return 1;
}

export interface BsTick {
  time: number;
  bsYear: number;
  /** 1-based BS month: 1 बैशाख, 4 श्रावण, 7 कार्तिक, 10 माघ. */
  bsMonth: number;
}

const QUARTER_MONTHS = [1, 4, 7, 10] as const;

/** The BS quarter starts (बैशाख, श्रावण, कार्तिक, माघ 1) inside [lo, hi], every `step` quarters. */
export function bsQuarterTicks(lo: number, hi: number, step: 1 | 2 | 4): BsTick[] {
  const firstYear = new Date(lo).getUTCFullYear() + 56;
  const lastYear = new Date(hi).getUTCFullYear() + 58;
  const ticks: BsTick[] = [];
  for (let bsYear = firstYear; bsYear <= lastYear; bsYear++) {
    QUARTER_MONTHS.forEach((bsMonth, quarter) => {
      if (quarter % step !== 0) return;
      let time: number;
      try {
        const ad = bs.toGreg(bsYear, bsMonth, 1);
        time = Date.UTC(ad.year, ad.month - 1, ad.day);
      } catch {
        return;
      }
      if (time >= lo && time <= hi) ticks.push({ time, bsYear, bsMonth });
    });
  }
  return ticks.sort((a, b) => a.time - b.time);
}

/** "श्रावण २०८३" (ne) / "श्रावण 2083" (en). */
export function bsTickLabel(tick: BsTick, language: string): string {
  return `${NEPALI_MONTHS[tick.bsMonth - 1]} ${localDigits(tick.bsYear, language)}`;
}

/** The first clause of a court case's "about", for the label beside its bar. */
export function aboutLead(about: string | null | undefined): string {
  return (about ?? "").split(/[।.:;] /)[0].replace(/[।.:;]\s*$/, "").trim();
}

/** Cut `text` to `max` characters with an ellipsis; never below one visible character. */
export function truncateLabel(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  if (max <= 1) return "…";
  return `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/** Approximate width of one 11px Devanagari/Latin character, in px. */
const CHAR_PX = 6.2;

/**
 * Where a bar's label goes and how many characters of "about" fit after the
 * case number: left-aligned at the bar's start, or right-aligned to its end
 * when the bar starts in the right third (it would run off the chart).
 */
export function barLabelLayout(opts: {
  x: number;
  x2: number;
  width: number;
  labelColumn: number;
  caseNumberLength: number;
}): { anchorEnd: boolean; room: number } {
  const { x, x2, width, labelColumn, caseNumberLength } = opts;
  const anchorEnd = x > width * 0.62;
  const px = anchorEnd ? x2 - labelColumn - 10 : width - x - 30;
  return { anchorEnd, room: Math.max(10, Math.floor(px / CHAR_PX) - caseNumberLength) };
}

// ---------------------------------------------------------------------------
// Merged timeline
// ---------------------------------------------------------------------------

export const TIMELINE_LATEST = 8;

export type TimelineItem =
  | { kind: "year"; year: string }
  | { kind: "event"; event: SeriesTimelineEvent; bsDate: string | null };

/** Events with a year header wherever the BS year changes (the first row always gets one). */
export function withYearHeaders(events: readonly SeriesTimelineEvent[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let year: string | null = null;
  for (const event of events) {
    const bsDate = eventBsDate(event);
    const eventYear = (bsDate ?? event.date ?? "").slice(0, 4);
    if (eventYear !== year) {
      items.push({ kind: "year", year: eventYear });
      year = eventYear;
    }
    items.push({ kind: "event", event, bsDate });
  }
  return items;
}

/**
 * The merged timeline for one filter: the latest `latest` events visible
 * (oldest first, as the API sorts them), or all of them with `showAll`. The
 * older ones are returned as `earlier` so the page can keep them mounted for
 * print while they are collapsed on screen.
 */
export function timelineView(
  events: readonly SeriesTimelineEvent[],
  memberSlug: string | null,
  showAll: boolean,
  latest = TIMELINE_LATEST,
): { earlier: TimelineItem[]; visible: TimelineItem[]; total: number } {
  const filtered = events.filter((e) => !memberSlug || e.member_slug === memberSlug);
  const split = showAll ? 0 : Math.max(0, filtered.length - latest);
  return {
    earlier: withYearHeaders(filtered.slice(0, split)),
    visible: withYearHeaders(filtered.slice(split)),
    total: filtered.length,
  };
}

// ---------------------------------------------------------------------------
// Case page banner
// ---------------------------------------------------------------------------

/** The case's place in the series and its neighbours, or null when it is not a member. */
export function seriesNeighbours(
  series: Pick<SeriesDetail, "members">,
  caseSlug: string,
): { member: SeriesMember; prev: SeriesMember | null; next: SeriesMember | null } | null {
  const ordered = [...series.members].sort((a, b) => a.ordinal - b.ordinal);
  const index = ordered.findIndex((m) => m.case.slug === caseSlug);
  if (index < 0) return null;
  return {
    member: ordered[index],
    prev: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
  };
}

/** The case's series memberships that are well-formed enough to link. */
export function validSeriesRefs(refs: readonly CaseSeriesRef[] | null | undefined): CaseSeriesRef[] {
  return (refs ?? []).filter((ref) => Boolean(ref?.slug) && Boolean(ref.title?.ne || ref.title?.en));
}

export function seriesPath(slug: string): string {
  return `/series/${encodeURIComponent(slug)}/`;
}

/** The in-site path of a material IRI (`…/material/<source>/<ident>`), or null. */
export function materialPathFromIri(iri: string | null | undefined): string | null {
  const match = /^https?:\/\/[^/]+(\/material\/[^/]+\/.+)$/.exec((iri ?? "").trim());
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * The series card of a search hit, or null. A "series" hit's `card` has its
 * own shape (not the case card the type declares), so it is checked here
 * rather than trusted.
 */
export function seriesCardOf(result: Pick<ArchiveSearchResult, "type" | "card">): SeriesSearchCard | null {
  if (result.type !== "series" || !result.card) return null;
  const card = result.card as unknown as Partial<SeriesSearchCard>;
  if (typeof card.slug !== "string" || !card.slug || !card.title || !card.totals) return null;
  return {
    slug: card.slug,
    title: card.title,
    summary: card.summary ?? { ne: null, en: null },
    totals: card.totals,
    members: Array.isArray(card.members) ? card.members : [],
  };
}

/** The slug of a series hit from its card, else from its `/series/<slug>/` URL. */
export function seriesSlugFromUrl(url: string | null | undefined): string | null {
  const match = /\/series\/([^/?#]+)/.exec(url ?? "");
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
