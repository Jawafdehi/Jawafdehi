import { describe, expect, it } from "vitest";

import { OPEN_HOUSE_REGIONS, detectRegion } from "./regions";

// Region pre-fill exists to remove a decision at the moment we are trying to
// lower the hurdle. It only has to be right often enough to be worth showing —
// the visitor can correct it in one click — but it must never invent a region
// for a timezone it does not recognise, because a confidently wrong answer is
// one the visitor has to notice before they can fix it.
describe("detectRegion", () => {
  it.each([
    ["Asia/Kathmandu", 345, "nepal-south-asia"],
    ["Asia/Kolkata", 330, "nepal-south-asia"],
    ["Asia/Karachi", 300, "nepal-south-asia"],
    // The Gulf holds a very large share of the Nepali diaspora, and its zones
    // sit under Asia/ like South Asia's do — so they are matched by name, not
    // by a prefix rule that would sweep them into the wrong slot.
    ["Asia/Qatar", 180, "gulf-middle-east"],
    ["Asia/Dubai", 240, "gulf-middle-east"],
    ["Asia/Riyadh", 180, "gulf-middle-east"],
    ["Asia/Kuala_Lumpur", 480, "east-southeast-asia"],
    ["Asia/Tokyo", 540, "east-southeast-asia"],
    ["Asia/Seoul", 540, "east-southeast-asia"],
    ["Europe/London", 60, "europe-africa"],
    ["Africa/Nairobi", 180, "europe-africa"],
    ["Australia/Sydney", 660, "australia-nz"],
    ["Pacific/Auckland", 780, "australia-nz"],
    ["America/New_York", -240, "north-america-east"],
    ["America/Chicago", -300, "north-america-east"],
    ["America/Los_Angeles", -420, "north-america-west"],
    ["America/Vancouver", -420, "north-america-west"],
    ["Pacific/Honolulu", -600, "north-america-west"],
  ])("maps %s to %s", (zone, offset, expected) => {
    expect(detectRegion(zone, offset)).toBe(expected);
  });

  it("returns null for an unrecognised zone rather than guessing", () => {
    expect(detectRegion("Antarctica/Troll", 0)).toBeNull();
    expect(detectRegion("", 0)).toBeNull();
  });

  it("only ever returns a region the API will accept", () => {
    const zones = [
      "Asia/Kathmandu",
      "Asia/Dubai",
      "Asia/Tokyo",
      "Europe/Berlin",
      "Australia/Perth",
      "America/Toronto",
      "America/Denver",
    ];
    for (const zone of zones) {
      const detected = detectRegion(zone, 0);
      if (detected !== null) {
        expect(OPEN_HOUSE_REGIONS).toContain(detected);
      }
    }
  });
});
