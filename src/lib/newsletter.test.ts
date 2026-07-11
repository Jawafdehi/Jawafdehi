import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DISMISS_TTL_MS,
  getNewsletterPromptState,
  setNewsletterPromptState,
} from "./newsletter";

const STORAGE_KEY = "jawafdehi_newsletter_prompt";

describe("newsletter prompt state", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    // Fixed clock so dismissal-age math is deterministic.
    vi.setSystemTime(new Date("2026-07-11T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(getNewsletterPromptState()).toBeNull();
  });

  it("suppresses permanently after subscribing", () => {
    setNewsletterPromptState("subscribed");
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z")); // ~6 months later
    expect(getNewsletterPromptState()).toBe("subscribed");
  });

  it("suppresses a dismissal within the 30-day window", () => {
    setNewsletterPromptState("dismissed");
    vi.advanceTimersByTime(DISMISS_TTL_MS - 1000); // just inside the window
    expect(getNewsletterPromptState()).toBe("dismissed");
  });

  it("re-asks once a dismissal ages past 30 days", () => {
    setNewsletterPromptState("dismissed");
    vi.advanceTimersByTime(DISMISS_TTL_MS + 1000); // just past the window
    expect(getNewsletterPromptState()).toBeNull();
  });

  it("honours legacy plain-string values as a no-expiry suppression", () => {
    window.localStorage.setItem(STORAGE_KEY, "dismissed");
    expect(getNewsletterPromptState()).toBe("dismissed");
    window.localStorage.setItem(STORAGE_KEY, "subscribed");
    expect(getNewsletterPromptState()).toBe("subscribed");
  });

  it("treats corrupt storage as absent (re-askable)", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getNewsletterPromptState()).toBeNull();
  });

  it("treats non-object JSON (e.g. 'null') as absent, without throwing", () => {
    window.localStorage.setItem(STORAGE_KEY, "null");
    expect(getNewsletterPromptState()).toBeNull();
  });
});
