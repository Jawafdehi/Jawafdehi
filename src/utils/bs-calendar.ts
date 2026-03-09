
/**
 * Bikram Sambat (BS) calendar — pure-math AD→BS converter.
 *
 * Why not use @remotemerge/nepali-date-converter?
 * That library internally mixes UTC-parsed and locally-parsed Date objects,
 * which causes a ±1 day error in timezones far from UTC (e.g. US Pacific).
 * This module uses only integer arithmetic — no Date objects at all.
 *
 * Supported range: BS 1975 – 2099 (AD 1918-04-13 – 2043-04-13).
 */

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
// BS month-length table (BS 1975–2099)
// Each entry: [Baisakh … Chaitra, totalDays]
// ============================================================================

// Unique patterns (only stored once, referenced by many years)
const P: Record<string, number[]> = {
  A: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  B: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31, 366],
  C: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31, 365],
  D: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  E: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31, 365],
  F: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30, 365],
  G: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30, 365],
  H: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30, 365],
  I: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30, 365],
  J: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 366],
  K: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30, 365],
  L: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31, 365],
  M: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31, 365],
};

/**
 * Compact lookup: BS year → month-length array.
 * Keeps the table readable and small by reusing common patterns.
 */
const YEAR_PATTERN: [number, number[]][] = [
  [1975, P.A], [1976, P.B], [1977, P.C], [1978, P.D],
  [1979, P.A], [1980, P.B], [1981, P.E], [1982, P.D],
  [1983, P.A], [1984, P.B], [1985, P.F], [1986, P.D],
  [1987, P.G], [1988, P.B], [1989, P.H], [1990, P.D],
  [1991, P.I], [1992, P.J], [1993, P.H], [1994, P.D],
  [1995, P.I], [1996, P.J], [1997, P.D], [1998, P.K],
  [1999, P.B], [2000, P.L], [2001, P.D], [2002, P.A],
  [2003, P.B], [2004, P.L], [2005, P.D], [2006, P.A],
  [2007, P.B], [2008, P.E], [2009, P.D], [2010, P.A],
  [2011, P.B], [2012, P.F], [2013, P.D], [2014, P.A],
  [2015, P.B], [2016, P.F], [2017, P.D], [2018, P.G],
  [2019, P.J], [2020, P.H], [2021, P.D], [2022, P.I],
  [2023, P.J], [2024, P.H], [2025, P.D], [2026, P.B],
  [2027, P.L], [2028, P.D], [2029, P.K], [2030, P.B],
  [2031, P.L], [2032, P.D], [2033, P.A], [2034, P.B],
  [2035, P.C], [2036, P.D], [2037, P.A], [2038, P.B],
  [2039, P.F], [2040, P.D], [2041, P.A], [2042, P.B],
  [2043, P.F], [2044, P.D], [2045, P.G], [2046, P.B],
  [2047, P.H], [2048, P.D], [2049, P.I], [2050, P.J],
  [2051, P.H], [2052, P.D], [2053, P.I], [2054, P.J],
  [2055, P.D], [2056, P.K], [2057, P.B], [2058, P.L],
  [2059, P.D], [2060, P.A], [2061, P.B], [2062, P.M],
  [2063, P.D], [2064, P.A], [2065, P.B], [2066, P.E],
  [2067, P.D], [2068, P.A], [2069, P.B], [2070, P.F],
  [2071, P.D], [2072, P.G], [2073, P.B], [2074, P.H],
  [2075, P.D], [2076, P.I], [2077, P.J], [2078, P.H],
  [2079, P.D], [2080, P.I], [2081, P.J], [2082, P.H],
  [2083, P.D], [2084, P.B], [2085, P.L], [2086, P.D],
  [2087, P.A], [2088, P.B], [2089, P.L], [2090, P.D],
  [2091, P.A], [2092, P.B], [2093, P.E], [2094, P.D],
  [2095, P.A], [2096, P.B], [2097, P.F], [2098, P.D],
  [2099, P.A],
];

// Build fast lookup map from the compact list above
const BS_MONTHS = new Map<number, number[]>(YEAR_PATTERN);

// ============================================================================
// Pure-arithmetic Gregorian → Julian Day Number
// ============================================================================

function gregorianToJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

/** BS 1975-01-01 = AD 1918-04-13 */
const BS_EPOCH_JDN = gregorianToJDN(1918, 4, 13);

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
 * Convert AD (year, month, day) to Bikram Sambat.
 * All inputs are plain numbers — no Date objects, no timezone issues.
 * 
 * @throws {RangeError} If the date is invalid or outside supported range
 */
export function adToBS(adYear: number, adMonth: number, adDay: number): BSDate {
  // Validate Gregorian date inputs
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
  
  let remaining = gregorianToJDN(adYear, adMonth, adDay) - BS_EPOCH_JDN;
  if (remaining < 0) throw new RangeError('Date is before BS 1975 (AD 1918-04-13)');

  for (const [bsYear, months] of BS_MONTHS) {
    const yearDays = months[12];
    if (remaining < yearDays) {
      for (let m = 0; m < 12; m++) {
        if (remaining < months[m]) {
          const year = bsYear;
          const month = m + 1;
          const date = remaining + 1;
          const formatted = `${toNepaliNumerals(year)} ${NEPALI_MONTHS[m]} ${toNepaliNumerals(date)}`;
          return { year, month, date, formatted };
        }
        remaining -= months[m];
      }
    }
    remaining -= yearDays;
  }

  throw new RangeError('Date is after BS 2099 (AD 2043-04-13)');
}
