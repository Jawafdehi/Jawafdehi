/**
 * Date formatting utilities with Kathmandu timezone support.
 * All dates on the website are displayed in Asia/Kathmandu (GMT+5:45).
 *
 */

import { parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { adToBS, formatBSString } from './bs-calendar';

const KATHMANDU_TZ = 'Asia/Kathmandu';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// ISO 8601 datetime with timezone offset (seconds optional per ISO 8601)
const DATETIME_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

// ── Helpers ──────────────────────────────────────────────────────────────

/** 
 * Parse an ISO string, treating bare YYYY-MM-DD as UTC midnight.
 * Rejects datetime strings without timezone info to prevent timezone-dependent interpretation.
 * 
 * @throws {Error} If datetime string lacks timezone offset
 */
function parse(dateString: string): Date {
  // Allow date-only strings (treated as UTC midnight)
  if (DATE_ONLY.test(dateString)) {
    return new Date(`${dateString}T00:00:00Z`);
  }
  
  // Reject datetime strings without timezone offset
  if (dateString.includes('T') && !DATETIME_WITH_OFFSET.test(dateString)) {
    throw new Error(
      `Invalid datetime: "${dateString}". Datetime strings must include timezone offset (Z or +HH:MM) to prevent timezone-dependent interpretation.`
    );
  }
  
  return parseISO(dateString);
}

/** Get the "YYYY-MM-DD" key for a date in Kathmandu timezone. */
function kathmanduKey(dateString: string): string {
  return formatInTimeZone(parse(dateString), KATHMANDU_TZ, 'yyyy-MM-dd');
}

// ── AD formatting ────────────────────────────────────────────────────────

/** Format a date string in Kathmandu timezone (default format: 'PP'). */
export function formatDate(dateString: string | null | undefined, fmt = 'PP'): string {
  if (!dateString) return 'N/A';
  try {
    return formatInTimeZone(parse(dateString), KATHMANDU_TZ, fmt);
  } catch {
    return 'Invalid Date';
  }
}

/** Format a date string with time in Kathmandu timezone. */
export function formatDateTime(dateString: string | null | undefined): string {
  return formatDate(dateString, 'PPp');
}

/**
 * Format a CMS publication date (a date-only "YYYY-MM-DD" value) as
 * "Month D, YYYY". Rendered in UTC — not Kathmandu like the helpers above — so
 * a date-only value shows the calendar day the editor entered regardless of the
 * viewer's timezone. Shared by the Updates list and the article detail/preview.
 */
export function formatPublicationDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// ── BS conversion ────────────────────────────────────────────────────────

/** Convert an ISO date string → BS date (year, month, date, formatted). */
export function convertToBS(dateString: string | null | undefined) {
  if (!dateString) return null;
  try {
    const d = parse(dateString);
    const y = Number(formatInTimeZone(d, KATHMANDU_TZ, 'yyyy'));
    const m = Number(formatInTimeZone(d, KATHMANDU_TZ, 'M'));
    const day = Number(formatInTimeZone(d, KATHMANDU_TZ, 'd'));
    return adToBS(y, m, day);
  } catch {
    return null;
  }
}

// ── Combined AD + BS formatting ──────────────────────────────────────────

/**
 * Format a date as "AD date | BS date".
 *
 * When `bsOverride` (a "YYYY-MM-DD" Bikram Sambat string) is supplied it is used
 * verbatim instead of recomputing the BS date, so curated source dates are
 * preserved exactly.
 */
export function formatDateWithBS(
  dateString: string | null | undefined,
  fmt = 'PP',
  bsOverride?: string | null
): string {
  if (!dateString) return 'N/A';
  const ad = formatDate(dateString, fmt);
  const overrideFormatted = formatBSString(bsOverride);
  if (overrideFormatted) return `${ad} | ${overrideFormatted}`;
  const bs = convertToBS(dateString);
  return bs ? `${ad} | ${bs.formatted}` : ad;
}

export interface LocalizedDatePair {
  primary: string;
  primaryCalendar: 'AD' | 'BS';
  secondary: string | null;
  secondaryCalendar: 'AD' | 'BS' | null;
}

/**
 * Format a date for bilingual case UI. The active language controls which
 * calendar is primary while keeping the other calendar available as context.
 */
export function formatDateForLanguage(
  dateString: string | null | undefined,
  fmt = 'PP',
  bsOverride?: string | null,
  language = 'en'
): LocalizedDatePair {
  const ad = formatDate(dateString, fmt);
  const overrideFormatted = formatBSString(bsOverride);
  const computedBs = overrideFormatted || convertToBS(dateString)?.formatted || null;
  const isNepali = language.startsWith('ne');

  if (isNepali && computedBs) {
    return {
      primary: computedBs,
      primaryCalendar: 'BS',
      secondary: ad === 'N/A' || ad === 'Invalid Date' ? null : ad,
      secondaryCalendar: ad === 'N/A' || ad === 'Invalid Date' ? null : 'AD',
    };
  }

  return {
    primary: ad,
    primaryCalendar: 'AD',
    secondary: computedBs,
    secondaryCalendar: computedBs ? 'BS' : null,
  };
}

export function formatDateRangeForLanguage(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  fmt = 'PP',
  startBsOverride?: string | null,
  endBsOverride?: string | null,
  language = 'en'
): LocalizedDatePair {
  const start = formatDateForLanguage(startDate, fmt, startBsOverride, language);

  if (!endDate) return start;

  const end = formatDateForLanguage(endDate, fmt, endBsOverride, language);

  return {
    primary: `${start.primary} - ${end.primary}`,
    primaryCalendar: start.primaryCalendar,
    secondary: start.secondary && end.secondary ? `${start.secondary} - ${end.secondary}` : start.secondary,
    secondaryCalendar: start.secondaryCalendar,
  };
}

export interface CaseDateRangeDisplay {
  primary: string;
  secondary: string | null;
}

/** Format a case date range as primary calendar plus optional parenthetical calendar. */
export function formatCaseDateRangeForLanguage(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  ongoingText = 'Ongoing',
  language = 'en'
): CaseDateRangeDisplay {
  if (!startDate && !endDate) return { primary: 'N/A', secondary: null };

  const formatSingle = (dateString: string) => formatDateForLanguage(dateString, 'PP', null, language);

  if (!startDate && endDate) {
    const end = formatSingle(endDate);
    return { primary: end.primary, secondary: end.secondary };
  }

  if (startDate && !endDate) {
    const start = formatSingle(startDate);
    return {
      primary: `${start.primary} - ${ongoingText}`,
      secondary: start.secondary ? `${start.secondary} - ${ongoingText}` : null,
    };
  }

  if (!startDate || !endDate) return { primary: 'N/A', secondary: null };

  try {
    if (kathmanduKey(startDate) === kathmanduKey(endDate)) {
      const single = formatSingle(startDate);
      return { primary: single.primary, secondary: single.secondary };
    }
  } catch {
    // Fall through to range formatting if either key cannot be parsed.
  }

  const range = formatDateRangeForLanguage(startDate, endDate, 'PP', null, null, language);
  return { primary: range.primary, secondary: range.secondary };
}

/** Format a start/end date range with BS dates, or show "Ongoing". */
export function formatCaseDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  ongoingText = 'Ongoing'
): string {
  if (!startDate && !endDate) return 'N/A';
  if (!startDate && endDate) return formatDateWithBS(endDate);
  if (startDate && !endDate) return `${formatDateWithBS(startDate)} - ${ongoingText}`;

  // Both dates exist at this point
  if (!startDate || !endDate) return 'N/A'; // Type narrowing
  
  try {
    if (kathmanduKey(startDate) === kathmanduKey(endDate)) {
      return formatDateWithBS(startDate);
    }
    return `${formatDateWithBS(startDate)} - ${formatDateWithBS(endDate)}`;
  } catch {
    return `${formatDateWithBS(startDate)} - ${formatDateWithBS(endDate)}`;
  }
}
