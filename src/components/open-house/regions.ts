/**
 * Open House regions.
 *
 * These are scheduling slots, not geography for its own sake. The Open House
 * time moves week to week to suit whoever is coming, so a signup's region is
 * what later makes "invite the people a 20:00 NPT slot actually works for"
 * possible. It cannot be backfilled without asking people again, which is why
 * it is captured at signup even though the sending work is still manual.
 *
 * ⚠️ Keep in lockstep with `OPEN_HOUSE_REGIONS` in the API's
 * `newsletter/serializers.py`. It is a closed list on both sides: the whole
 * point of the field is filtering, and free text does not filter.
 */
export const OPEN_HOUSE_REGIONS = [
  "nepal-south-asia",
  "gulf-middle-east",
  "east-southeast-asia",
  "europe-africa",
  "australia-nz",
  "north-america-east",
  "north-america-west",
] as const;

export type OpenHouseRegion = (typeof OPEN_HOUSE_REGIONS)[number];

/** Zones that decide a region on their own, before the prefix rules below. */
const SOUTH_ASIA_ZONES = new Set([
  "Asia/Kathmandu",
  "Asia/Katmandu",
  "Asia/Kolkata",
  "Asia/Calcutta",
  "Asia/Karachi",
  "Asia/Colombo",
  "Asia/Dhaka",
  "Asia/Thimphu",
  "Asia/Kabul",
]);

const GULF_MIDDLE_EAST_ZONES = new Set([
  "Asia/Dubai",
  "Asia/Qatar",
  "Asia/Riyadh",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Asia/Baghdad",
  "Asia/Tehran",
  "Asia/Amman",
  "Asia/Beirut",
  "Asia/Damascus",
  "Asia/Jerusalem",
  "Asia/Tel_Aviv",
  "Asia/Nicosia",
]);

/**
 * Where the Americas split. Pacific time sits at -480/-420 depending on DST, so
 * anything at or west of -420 is treated as the western slot. Mountain time
 * straddles it across the year — which is fine, because this only pre-fills a
 * dropdown the visitor can correct in one click.
 */
const AMERICAS_WEST_MAX_OFFSET_MINUTES = -420;

/**
 * Best guess at the visitor's region from their browser timezone.
 *
 * Returns null rather than guessing wildly when nothing matches: an empty
 * dropdown the visitor fills in beats a confidently wrong answer they have to
 * notice first.
 */
export function detectRegion(
  timeZone?: string,
  offsetMinutes?: number,
): OpenHouseRegion | null {
  let zone = timeZone;
  let offset = offsetMinutes;

  if (zone === undefined) {
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      zone = undefined;
    }
  }
  if (offset === undefined) {
    // getTimezoneOffset is minutes *behind* UTC, so negate it to get the
    // conventional "minutes east of UTC".
    offset = -new Date().getTimezoneOffset();
  }

  if (!zone) return null;

  if (SOUTH_ASIA_ZONES.has(zone)) return "nepal-south-asia";
  if (GULF_MIDDLE_EAST_ZONES.has(zone)) return "gulf-middle-east";

  const area = zone.split("/")[0];

  if (area === "Asia" || area === "Indian") return "east-southeast-asia";
  if (area === "Europe" || area === "Africa" || area === "Atlantic") return "europe-africa";
  if (area === "Australia") return "australia-nz";
  if (area === "Pacific") {
    // Pacific/* spans New Zealand through Honolulu. Positive offsets are the
    // Australia/NZ side; the rest are closer to the US west coast.
    return offset > 0 ? "australia-nz" : "north-america-west";
  }
  if (area === "America" || area === "Canada" || area === "US") {
    return offset <= AMERICAS_WEST_MAX_OFFSET_MINUTES
      ? "north-america-west"
      : "north-america-east";
  }

  return null;
}
