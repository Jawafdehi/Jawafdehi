/**
 * The rules behind /new-cases: which week a case was published in, which weeks
 * the page shows, and how the case list is paged in from the API.
 *
 * Weeks run Friday → Thursday, because the weekly digest goes out on Thursday:
 * a week's heading names exactly the cases that digest covered. "Today" is the
 * date in Nepal, whatever the reader's own timezone.
 *
 * Dates are plain ISO "YYYY-MM-DD" strings throughout (`case_publish_date` is a
 * date, not a timestamp), and all arithmetic is done in UTC on those, so the
 * result never depends on the machine's timezone.
 */
import { COURT_NAMES } from "@/data/court-names";
import { adToBS, NEPALI_MONTHS, toNepaliNumerals } from "@/utils/bs-calendar";
import { formatCourtName } from "@/utils/court-case-format";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import type { Case, PaginatedCaseList } from "@/types/jds";

export const NEPAL_TIME_ZONE = "Asia/Kathmandu";

/** Weeks shown on first load, and added by each "show older weeks". */
export const WEEKS_PER_STEP = 8;

/** Most API pages one load will walk before giving up on reaching the cutoff. */
export const MAX_PAGES = 10;

/** Cases per API page. The server honours up to 200. */
export const PAGE_SIZE = 100;

/** JS `getUTCDay()` of the first day of a digest week: Friday. */
const WEEK_START_DAY = 5;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIso(iso: string): Date | null {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Reject roll-overs like 2026-02-31.
  return date.toISOString().slice(0, 10) === iso ? date : null;
}

/** The ISO date part of a `case_publish_date`, or null when it has none. */
export function publishDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.trim().slice(0, 10);
  return parseIso(day) ? day : null;
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  if (!date) throw new RangeError(`not an ISO date: ${iso}`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Today's date in Nepal, as "YYYY-MM-DD". */
export function nepalToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NEPAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The Friday that starts the digest week `iso` falls in. */
export function weekStartOf(iso: string): string {
  const date = parseIso(iso);
  if (!date) throw new RangeError(`not an ISO date: ${iso}`);
  const back = (date.getUTCDay() - WEEK_START_DAY + 7) % 7;
  return addDays(iso, -back);
}

export interface WeekRange {
  /** Friday, inclusive. */
  start: string;
  /** Thursday, inclusive. */
  end: string;
}

/** The `count` most recent digest weeks, newest first, the current one included. */
export function recentWeeks(today: string, count: number): WeekRange[] {
  const current = weekStartOf(today);
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const start = addDays(current, -7 * i);
    return { start, end: addDays(start, 6) };
  });
}

/** The earliest publish date the page needs for `weeks` weeks: the oldest week's Friday. */
export function cutoffFor(today: string, weeks: number): string {
  return addDays(weekStartOf(today), -7 * (Math.max(1, weeks) - 1));
}

/** Newest publish date first; undated cases last; ties keep the newest id first. */
export function sortByPublishDateDesc<T extends Pick<Case, "id" | "case_publish_date">>(cases: readonly T[]): T[] {
  return [...cases].sort((a, b) => {
    const da = publishDate(a.case_publish_date) ?? "";
    const db = publishDate(b.case_publish_date) ?? "";
    if (da !== db) return da < db ? 1 : -1;
    return b.id - a.id;
  });
}

export interface WeekGroup<T> extends WeekRange {
  cases: T[];
}

/**
 * Every one of the `weeks` most recent weeks, newest first, each with the cases
 * published in it (newest first). Weeks with no cases are kept, so the page can
 * say a week was quiet rather than silently skip it. Cases dated outside the
 * window, or with no publish date, are dropped.
 */
export function groupCasesByWeek<T extends Pick<Case, "id" | "case_publish_date">>(
  cases: readonly T[],
  today: string,
  weeks: number,
): WeekGroup<T>[] {
  const groups = recentWeeks(today, weeks).map((week) => ({ ...week, cases: [] as T[] }));
  const byStart = new Map(groups.map((group) => [group.start, group]));
  for (const item of sortByPublishDateDesc(cases)) {
    const day = publishDate(item.case_publish_date);
    if (!day) continue;
    byStart.get(weekStartOf(day))?.cases.push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Paging the case list in
// ---------------------------------------------------------------------------

export type CasePageFetcher = (page: number) => Promise<PaginatedCaseList>;

export interface PublishedSinceResult {
  /** Every case published on or after the cutoff, newest first, de-duplicated. */
  cases: Case[];
  /** Whether the API holds cases older than the cutoff (or pages not walked). */
  hasOlder: boolean;
}

/** The `page` number in a DRF `next` link, or null when there is none. */
export function nextPageNumber(next: string | null | undefined): number | null {
  if (!next) return null;
  try {
    const page = Number(new URL(next, "https://jawafdehi.org").searchParams.get("page"));
    return Number.isInteger(page) && page > 0 ? page : null;
  } catch {
    return null;
  }
}

/**
 * Collect the cases published on or after `cutoff`.
 *
 * Asks the API for `ordering=-case_publish_date&published_after=<cutoff>`, but
 * does not rely on either: the result is filtered and sorted here, so an API
 * that ignores them (and orders by creation date) still gives the right cases
 * from the pages it was walked through.
 *
 * Paging follows `next` to the end or to `maxPages`. There is deliberately no
 * "this page is all older, stop" shortcut: an API that honours the filter never
 * returns such a page, and one that ignores it orders by creation date, where a
 * page of old cases says nothing about the next one.
 *
 * Whether older cases exist: an unfiltered response shows it directly. A
 * filtered one never contains them, so `probeOlder` (when given) asks.
 */
export async function fetchPublishedSince(
  fetchPage: CasePageFetcher,
  cutoff: string,
  maxPages: number = MAX_PAGES,
  probeOlder?: () => Promise<boolean>,
): Promise<PublishedSinceResult> {
  const seen = new Map<number, Case>();
  let sawOlder = false;
  let page: number | null = 1;
  let pagesRead = 0;

  while (page !== null && pagesRead < maxPages) {
    const response = await fetchPage(page);
    pagesRead += 1;
    for (const item of response.results ?? []) {
      const day = publishDate(item.case_publish_date);
      if (day && day >= cutoff) seen.set(item.id, item);
      else sawOlder = true;
    }
    page = nextPageNumber(response.next);
  }

  let hasOlder = sawOlder || page !== null;
  if (!hasOlder && probeOlder) {
    // A failed probe must not fail the page: offer the button and let the
    // next load find out.
    hasOlder = await probeOlder().catch(() => true);
  }

  return { cases: sortByPublishDateDesc([...seen.values()]), hasOlder };
}

/** Whether a probe response holds a case published before `cutoff`. */
export function hasCaseBefore(response: PaginatedCaseList, cutoff: string): boolean {
  return (response.results ?? []).some((item) => {
    const day = publishDate(item.case_publish_date);
    return day !== null && day < cutoff;
  });
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function bsParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const bs = adToBS(y, m, d);
  return { year: bs.year, month: NEPALI_MONTHS[bs.month - 1], monthNumber: bs.month, day: bs.date };
}

/** A week in Bikram Sambat, in Nepali numerals: "२०८३ मंसिर ५–११". */
export function formatWeekBS({ start, end }: WeekRange): string {
  const a = bsParts(start);
  const b = bsParts(end);
  const n = toNepaliNumerals;
  if (a.year === b.year && a.monthNumber === b.monthNumber) {
    return `${n(a.year)} ${a.month} ${n(a.day)}–${n(b.day)}`;
  }
  if (a.year === b.year) {
    return `${n(a.year)} ${a.month} ${n(a.day)} – ${b.month} ${n(b.day)}`;
  }
  return `${n(a.year)} ${a.month} ${n(a.day)} – ${n(b.year)} ${b.month} ${n(b.day)}`;
}

const AD_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function adParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: AD_MONTHS[m - 1], monthNumber: m, day: d };
}

/** A week in the Gregorian calendar: "20–26 Nov 2026". */
export function formatWeekAD({ start, end }: WeekRange): string {
  const a = adParts(start);
  const b = adParts(end);
  if (a.year === b.year && a.monthNumber === b.monthNumber) {
    return `${a.day}–${b.day} ${a.month} ${a.year}`;
  }
  if (a.year === b.year) {
    return `${a.day} ${a.month} – ${b.day} ${b.month} ${a.year}`;
  }
  return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
}

/** A case's publish date for its row: "मंसिर ८" in Nepali, "24 Nov" in English. */
export function formatRowDate(iso: string, language: string): string {
  if (language === "ne") {
    const bs = bsParts(iso);
    return `${bs.month} ${toNepaliNumerals(bs.day)}`;
  }
  const ad = adParts(iso);
  return `${ad.day} ${ad.month}`;
}

/** A count in the reader's numerals. */
export function formatCount(count: number, language: string): string {
  return language === "ne" ? toNepaliNumerals(count) : String(count);
}

/** The case title in the reader's language, falling back to the Nepali title. */
export function caseTitleFor(item: Pick<Case, "title" | "title_en">, language: string): string {
  if (language !== "ne" && item.title_en?.trim()) return item.title_en.trim();
  return item.title;
}

export interface CourtChip {
  key: string;
  href: string;
  label: string;
}

/** A case's court reference as a chip: "083-CR-0063 · विशेष अदालत", linking to its page. */
export function courtChip(ref: string, language: string): CourtChip | null {
  const parts = parseCourtCaseRef(ref);
  if (!parts) return null;
  const lang = language === "ne" ? "ne" : "en";
  const court = parts.court.toLowerCase();
  const courtName = COURT_NAMES[court]?.[lang] ?? formatCourtName(court, lang);
  return {
    key: `${court}/${parts.caseNumber.toLowerCase()}`,
    href: `/courtcase/${encodeURIComponent(court)}/${encodeURIComponent(parts.caseNumber)}`,
    label: `${parts.caseNumber.toUpperCase()} · ${courtName}`,
  };
}

// ---------------------------------------------------------------------------
// Feeds
// ---------------------------------------------------------------------------

export const FEED_BASE_URL = "https://api.jawafdehi.org/api/feeds/new-cases";

/** The RSS and Atom feed URLs, with English titles when the page is in English. */
export function feedUrls(language: string): { rss: string; atom: string } {
  const query = language === "ne" ? "" : "?lang=en";
  return { rss: `${FEED_BASE_URL}.rss${query}`, atom: `${FEED_BASE_URL}.atom${query}` };
}
