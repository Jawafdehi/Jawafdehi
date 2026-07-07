/**
 * Cookie/analytics consent state.
 *
 * Stores the visitor's opt-in decision for non-essential cookies (Google
 * Analytics). Essential cookies (language preference, caseworker session) and
 * error monitoring are not gated by this. See the Privacy Policy.
 */

const STORAGE_KEY = "jawafdehi_analytics_consent";

export type ConsentValue = "granted" | "denied";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore (private mode / storage disabled)
  }
}
