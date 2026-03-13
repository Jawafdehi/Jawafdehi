
/**
 * Bikram Sambat (BS) calendar using the bikram-sambat npm package.
 * 
 * This replaces our custom pure-math implementation with a well-tested
 * npm package while maintaining timezone independence by using date strings.
 */

import bs from 'bikram-sambat';

// ============================================================================
// Nepali locale data
// ============================================================================

export const NEPALI_MONTHS = [
  'बैशाख', 'जेष्ठ', 'आषाढ', 'श्रावण', 'भाद्र', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
] as const;

const NEPALI_NUMERALS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliNumerals(num: number): string {
  return String(num)
    .split('')
    .map((d) => NEPALI_NUMERALS[parseInt(d, 10)] ?? d)
    .join('');
}

// ============================================================================
// Public API
// ============================================================================

export interface BSDate {
  year: number;
  month: number;   // 1-12
  date: number;     // 1-32
  formatted: string; // e.g. "२०८२ पौष १७"
}

/**
 * Convert AD (year, month, day) to Bikram Sambat using bikram-sambat package.
 * Uses date strings to avoid timezone issues.
 * 
 * @throws {RangeError} If the date is invalid or outside supported range
 */
export function adToBS(adYear: number, adMonth: number, adDay: number): BSDate {
  // Validate inputs
  if (!Number.isInteger(adYear) || !Number.isInteger(adMonth) || !Number.isInteger(adDay)) {
    throw new RangeError('Year, month, and day must be integers');
  }
  
  if (adMonth < 1 || adMonth > 12) {
    throw new RangeError(`Invalid month: ${adMonth}. Must be 1-12`);
  }
  
  if (adDay < 1 || adDay > 31) {
    throw new RangeError(`Invalid day: ${adDay}. Must be 1-31`);
  }
  
  // Validate day is valid for the given month/year
  const daysInMonth = new Date(adYear, adMonth, 0).getDate();
  if (adDay > daysInMonth) {
    throw new RangeError(`Invalid date: ${adYear}-${adMonth}-${adDay}. Month ${adMonth} has only ${daysInMonth} days`);
  }
  
  try {
    // Create date string (timezone-safe)
    const adString = `${adYear}-${adMonth.toString().padStart(2, '0')}-${adDay.toString().padStart(2, '0')}`;
    
    // Convert using bikram-sambat package
    const bsResult = bs.toBik(adString);
    
    const year = bsResult.year;
    const month = bsResult.month;
    const date = bsResult.day;
    const formatted = `${toNepaliNumerals(year)} ${NEPALI_MONTHS[month - 1]} ${toNepaliNumerals(date)}`;
    
    return { year, month, date, formatted };
    
  } catch (error) {
    if (error instanceof Error) {
      throw new RangeError(`Date conversion failed: ${error.message}`);
    }
    throw new RangeError('Date conversion failed');
  }
}
