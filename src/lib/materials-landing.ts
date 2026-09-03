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

/**
 * Folder tint utilities by index. Tailwind must see every class literally,
 * so the tint number resolves through this table, never interpolation.
 */
const FOLDER_TINT_CLASSES: Record<number, string> = {
  1: "bg-folder-1",
  2: "bg-folder-2",
  3: "bg-folder-3",
  4: "bg-folder-4",
  5: "bg-folder-5",
  6: "bg-folder-6",
  7: "bg-folder-7",
  8: "bg-folder-8",
};

export function folderTintClass(tint: number): string {
  return FOLDER_TINT_CLASSES[tint] ?? FOLDER_TINT_CLASSES[1];
}

/** Language-aware pick from a bilingual pair, falling back across languages. */
export function pickLocalized(
  text: { ne?: string | null; en?: string | null } | undefined,
  language: string,
): string {
  if (!text) return "";
  const nepali = language.startsWith("ne");
  const primary = nepali ? text.ne : text.en;
  const fallback = nepali ? text.en : text.ne;
  return (primary || fallback || "").replace(/<[^>]*>/g, "");
}

/**
 * A resolved date as one ledger line: the reader's calendar first, the other
 * only when the preferred one is missing. Numeric Y-M-D on purpose — these
 * sit in the mono "register" face.
 */
export function formatLedgerDate(date: ResolvedMaterialDate, language: string): string {
  const devanagari = (value: string) =>
    value.replace(/\d/g, (digit) => toNepaliNumerals(Number(digit)));
  if (language.startsWith("ne")) {
    if (date.bs) return devanagari(date.bs);
    return date.ad ?? "";
  }
  if (date.ad) return date.ad;
  return date.bs ? `${date.bs} BS` : "";
}

