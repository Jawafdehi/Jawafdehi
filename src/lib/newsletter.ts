/**
 * Newsletter signup prompt state.
 *
 * Remembers whether the visitor has dismissed the entry newsletter modal or
 * already subscribed, so the prompt is shown at most once per browser.
 */

const STORAGE_KEY = "jawafdehi_newsletter_prompt";

export type NewsletterPromptValue = "dismissed" | "subscribed";

export function getNewsletterPromptState(): NewsletterPromptValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "dismissed" || v === "subscribed" ? v : null;
  } catch {
    return null;
  }
}

export function setNewsletterPromptState(value: NewsletterPromptValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore (private mode / storage disabled)
  }
}
