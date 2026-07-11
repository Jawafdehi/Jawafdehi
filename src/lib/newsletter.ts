/**
 * Newsletter signup prompt state.
 *
 * Remembers whether the visitor dismissed the entry newsletter modal or already
 * subscribed, so the prompt isn't shown too often:
 *   - "subscribed" suppresses the prompt permanently (never re-ask a subscriber).
 *   - "dismissed" suppresses it for {@link DISMISS_TTL_MS} (30 days), after which
 *     the visitor becomes eligible again — a single accidental dismissal no
 *     longer loses them forever.
 *
 * The value is stored as JSON with the timestamp it was written. Legacy plain
 * string values ("dismissed" / "subscribed") written by earlier builds are still
 * honoured (treated as a suppression with no expiry) so nobody who already acted
 * gets re-prompted on their next visit.
 */

const STORAGE_KEY = "jawafdehi_newsletter_prompt";

/** How long a dismissal suppresses the prompt before the visitor is eligible again. */
export const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type NewsletterPromptValue = "dismissed" | "subscribed";

type StoredPrompt = { state: NewsletterPromptValue; ts: number };

/**
 * The *effective* prompt state. Returns null when the visitor may be prompted:
 * either nothing is stored, or a dismissal has aged past its TTL. A subscription
 * never expires.
 */
export function getNewsletterPromptState(): NewsletterPromptValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    // Legacy plain-string values (pre-TTL builds): honour as a no-expiry suppression.
    if (raw === "subscribed" || raw === "dismissed") return raw;

    const parsed: unknown = JSON.parse(raw);
    // Guard against non-object JSON (e.g. "null", a number) before reading fields.
    if (typeof parsed !== "object" || parsed === null) return null;
    const { state, ts } = parsed as Partial<StoredPrompt>;
    if (state === "subscribed") return "subscribed";
    if (state === "dismissed") {
      const fresh = typeof ts === "number" && Date.now() - ts < DISMISS_TTL_MS;
      return fresh ? "dismissed" : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function setNewsletterPromptState(value: NewsletterPromptValue): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPrompt = { state: value, ts: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (private mode / storage disabled)
  }
}
