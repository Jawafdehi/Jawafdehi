import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { NewsletterSignupModal } from "@/components/home/newsletter-signup-modal";

// Passthrough i18n so assertions don't depend on translation resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

// The form pulls in the API client + form controls; the trigger logic under test
// doesn't need them, so stub it to a marker.
vi.mock("@/components/home/newsletter-form", () => ({
  NewsletterForm: () => <div data-testid="newsletter-form" />,
}));

// Minimal jsdom polyfills the Radix Dialog touches when it opens.
beforeEach(() => {
  window.matchMedia ??= vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.hasPointerCapture ??= vi.fn(() => false);
  Element.prototype.releasePointerCapture ??= vi.fn();
});

const STORAGE_KEY = "jawafdehi_newsletter_prompt";
const DWELL_MS = 25000;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NewsletterSignupModal />
    </MemoryRouter>,
  );
}

describe("NewsletterSignupModal trigger", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("stays closed until the dwell elapses, then opens on an eligible route", () => {
    renderAt("/case/some-case");
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => vi.advanceTimersByTime(DWELL_MS));
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  it("never opens on an ineligible route", () => {
    renderAt("/about");
    act(() => vi.advanceTimersByTime(DWELL_MS * 3));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays closed while a recent dismissal is stored", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: "dismissed", ts: Date.now() }),
    );
    renderAt("/");
    act(() => vi.advanceTimersByTime(DWELL_MS));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
