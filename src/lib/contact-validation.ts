/**
 * Shared client-side patterns for the contact fields the signup forms collect.
 *
 * These exist so the browser can say "that address looks wrong" before a round
 * trip. They are a courtesy, never the authority: the API validates
 * independently and is what actually decides.
 */

/** Deliberately loose — real addresses are stranger than most regexes allow. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mirrors `_WHATSAPP_ALLOWED` in the API's `newsletter/serializers.py`: digits
 * with the separators people actually type, and an optional leading `+`.
 *
 * ⚠️ ASCII digits only, and that is the point. Python's `\d` matches Unicode
 * digits, so the server-side pattern alone would accept Devanagari numerals
 * (९८४१…) and "normalise" them into a number nobody can dial. On a Nepali-first
 * site that is a realistic way to collect unusable contacts, so the browser
 * catches it first and the API rejects it too.
 */
export const WHATSAPP_PATTERN = /^\+?[0-9\s().-]{5,31}$/;

/** Digits kept after normalisation, used to reject numbers that are too short. */
export function whatsappDigitCount(value: string): number {
  return value.replace(/[^0-9]/g, "").length;
}
