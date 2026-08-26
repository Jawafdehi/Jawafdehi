import bs from "bikram-sambat";

import { adToBS, toNepaliNumerals } from "@/utils/bs-calendar";
import { formatIndianNumber } from "@/utils/number";

import type { ArchiveSearchResult, SearchResultExtra } from "@/types/search";

/**
 * Pure helpers behind the /materials landing page. Everything here is a
 * function of API data — no fetching, no i18n context — so the date-quirk
 * handling below is unit-testable in isolation.
 */

/** A search hit's date resolved into both calendars (ISO-style Y-M-D). */
export interface ResolvedMaterialDate {
  ad: string | null;
  bs: string | null;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function bsToAdString(bsDate: string): string | null {
  const match = DATE_RE.exec(bsDate);
  if (!match) return null;
  try {
    const greg = bs.toGreg(Number(match[1]), Number(match[2]), Number(match[3]));
    return `${greg.year}-${pad2(greg.month)}-${pad2(greg.day)}`;
  } catch {
    // Outside the bikram-sambat conversion tables — surface the BS date alone.
    return null;
  }
}

function adToBsString(adDate: string): string | null {
  const match = DATE_RE.exec(adDate);
  if (!match) return null;
  try {
    const converted = adToBS(Number(match[1]), Number(match[2]), Number(match[3]));
    return `${converted.year}-${pad2(converted.month)}-${pad2(converted.date)}`;
  } catch {
    return null;
  }
}

/**
 * Resolve a material search hit's date into both calendars, absorbing a known
 * data-lake quirk: several sources store a BIKRAM SAMBAT date in the AD
 * `date` field (and omit `date_bs`), so "newest" search results lead with
 * dates like 2082-11-27. A four-digit year later than next AD year cannot be
 * a real AD document date, so it is read as BS. When `date_bs` is present the
 * pair is trusted as-is.
 */
export function resolveMaterialDate(
  extra: SearchResultExtra | undefined,
  currentAdYear: number = new Date().getFullYear(),
): ResolvedMaterialDate {
  const date = extra?.date ?? null;
  const dateBs = extra?.date_bs ?? null;
  if (date && dateBs) return { ad: date, bs: dateBs };
  if (!date) return { ad: null, bs: dateBs };

  const match = DATE_RE.exec(date);
  if (!match) return { ad: null, bs: null };
  const year = Number(match[1]);
  if (year > currentAdYear + 1) {
    // BS stored in the AD field.
    return { ad: bsToAdString(date), bs: date };
  }
  return { ad: date, bs: adToBsString(date) };
}

/** A search hit paired with its resolved date, ready for the recents table. */
export interface RecentMaterial {
  result: ArchiveSearchResult;
  date: ResolvedMaterialDate;
}

/**
 * Order material search hits by real recency and keep the newest `count`.
 *
 * The search backend's `sort=newest` compares the raw `date` field, so the
 * BS-in-AD quirk above floats mis-fielded dates (year 2082 "AD") over
 * genuinely newer documents. Re-sorting on the RESOLVED AD date puts the list
 * back in true order; undated documents are dropped — a "recently added"
 * table cannot honestly place them.
 */
export function pickRecentMaterials(
  results: readonly ArchiveSearchResult[],
  count: number,
  currentAdYear: number = new Date().getFullYear(),
): RecentMaterial[] {
  return results
    .map((result) => ({ result, date: resolveMaterialDate(result.extra, currentAdYear) }))
    .filter((entry): entry is RecentMaterial & { date: { ad: string } } =>
      Boolean(entry.date.ad),
    )
    .sort((a, b) => b.date.ad.localeCompare(a.date.ad))
    .slice(0, count);
}

/**
 * The data-lake source token embedded in a material URL
 * (`/material/<source>/<ident>`). Sources may themselves contain slashes
 * (`province/koshi`), so everything between the prefix and the LAST segment
 * is the token.
 */
export function sourceFromMaterialUrl(url: string): string | null {
  const path = url.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0];
  const match = /^\/material\/(.+)$/.exec(path);
  if (!match) return null;
  const segments = match[1].split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return segments.slice(0, -1).join("/");
}

/**
 * An archive figure in the reader's numerals: Indian-system grouping in both
 * languages ("3,45,886"), Devanagari digits in Nepali ("३,४५,८८६").
 */
export function formatArchiveCount(value: number, language: string): string {
  const grouped = formatIndianNumber(value);
  if (!language.startsWith("ne")) return grouped;
  return grouped.replace(/\d/g, (digit) => toNepaliNumerals(Number(digit)));
}

/** The archive's coverage span in both calendars, from real endpoint data. */
export interface ArchiveYearRange {
  adFrom: number;
  adTo: number;
  bsFrom: number;
  bsTo: number;
}

export function archiveYearRange(
  oldest: SearchResultExtra | undefined,
  lastUpdatedIso: string | null | undefined,
  currentAdYear: number = new Date().getFullYear(),
): ArchiveYearRange | null {
  const oldestDate = resolveMaterialDate(oldest, currentAdYear);
  if (!oldestDate.ad) return null;
  const adFrom = Number(oldestDate.ad.slice(0, 4));
  const bsFrom = oldestDate.bs ? Number(oldestDate.bs.slice(0, 4)) : adFrom + 57;
  const adTo = lastUpdatedIso ? Number(lastUpdatedIso.slice(0, 4)) : currentAdYear;
  let bsTo: number;
  try {
    // Mid-year anchor: only the BS YEAR is displayed, so July is a safe pick
    // for deriving it from an AD year.
    bsTo = adToBS(adTo, 7, 1).year;
  } catch {
    bsTo = adTo + 57;
  }
  if (!Number.isFinite(adFrom) || !Number.isFinite(adTo)) return null;
  return { adFrom, adTo, bsFrom, bsTo };
}
