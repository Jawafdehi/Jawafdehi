import type { LocalizedDatePair } from "@/utils/date";

type CompactDateLabel = { label: string; year: string | null } | null;

export interface TimelineRow {
  date: LocalizedDatePair;
  primaryDate: CompactDateLabel;
  secondaryDate: CompactDateLabel;
}

const DEVANAGARI_ZERO = 0x0966; // '०'

/**
 * Parse a year label to a number for ordering. Handles both ASCII (AD years) and
 * Devanagari (BS years, e.g. "२०८१") digits so the range endpoints are computed
 * numerically regardless of digit script.
 */
export function yearToNumber(year: string): number {
  let out = "";
  for (const ch of year) {
    const code = ch.codePointAt(0)!;
    if (ch >= "0" && ch <= "9") out += ch;
    else if (code >= DEVANAGARI_ZERO && code <= DEVANAGARI_ZERO + 9) {
      out += String(code - DEVANAGARI_ZERO);
    }
  }
  const parsed = Number.parseInt(out, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Build the group-heading text for each primary-calendar year. The timeline rows
 * only carry the day/month in the secondary calendar, so the year would
 * otherwise appear in one calendar (AD in English) but not the other. Surface
 * the secondary-calendar year(s) in the heading. A single AD year can span two
 * BS years (the BS new year falls mid-April), so aggregate the distinct
 * secondary years seen within each group and render them as a min…max range.
 * The endpoints are chosen numerically, so the result is independent of the
 * order the rows arrive in (chronological or reverse-chronological).
 */
export function buildYearGroupHeadings(rows: TimelineRow[]): Map<string, string> {
  const secondaryYears = new Map<string, string[]>();
  let secondaryCalendar: "AD" | "BS" | null = null;

  for (const row of rows) {
    const primaryYear = row.primaryDate?.year;
    if (!primaryYear) continue;

    if (!secondaryCalendar && row.date.secondaryCalendar) {
      secondaryCalendar = row.date.secondaryCalendar;
    }

    const seen = secondaryYears.get(primaryYear) ?? [];
    const secondaryYear = row.secondaryDate?.year;
    if (secondaryYear && !seen.includes(secondaryYear)) seen.push(secondaryYear);
    secondaryYears.set(primaryYear, seen);
  }

  const headings = new Map<string, string>();
  for (const [primaryYear, years] of secondaryYears) {
    if (years.length === 0 || !secondaryCalendar) {
      headings.set(primaryYear, primaryYear);
      continue;
    }
    // Order-independent: sort the distinct secondary years numerically and use
    // the min…max endpoints so reverse-chronological input still ranges right.
    const sorted = [...years].sort((a, b) => yearToNumber(a) - yearToNumber(b));
    const span = sorted.length === 1 ? sorted[0] : `${sorted[0]}–${sorted[sorted.length - 1]}`;
    headings.set(primaryYear, `${primaryYear} (${span} ${secondaryCalendar})`);
  }

  return headings;
}
