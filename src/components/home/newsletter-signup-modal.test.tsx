import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";

import { NewsletterSignupModal, OPEN_DELAY_MS } from "@/components/home/newsletter-signup-modal";

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
// Imported, not restated: a second copy of the number here would let the spec
// keep passing against a dwell the component no longer uses. The value itself is
// gated separately, in "the dwell is a full minute" below.
const DWELL_MS = OPEN_DELAY_MS;
const CASE_PATH = "/case/case-081-cr-0107-patanjali";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NewsletterSignupModal />
    </MemoryRouter>,
  );
}

/** Buttons that navigate between an eligible and an ineligible route in-app. */
function Nav() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/about")}>
        to-ineligible
      </button>
      <button type="button" onClick={() => navigate("/updates")}>
        to-eligible
      </button>
    </>
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

  // The number is a product decision, not an implementation detail: at 25s the
  // ask was arriving on a reader's first screen, before the page had earned it.
  // Asserted explicitly so shortening it again is a deliberate act.
  it("the dwell is a full minute", () => {
    expect(OPEN_DELAY_MS).toBe(60_000);
  });

  it("stays closed until the dwell elapses, then opens on an eligible route", () => {
    renderAt(CASE_PATH);
    expect(screen.queryByRole("dialog")).toBeNull();
    // One second short of the dwell it must still be closed — without this the
    // spec would pass against any delay at or under a minute.
    act(() => vi.advanceTimersByTime(DWELL_MS - 1000));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
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

  it("opens on return to an eligible route when the dwell fired on an ineligible one", () => {
    render(
      <MemoryRouter initialEntries={[CASE_PATH]}>
        <Nav />
        <NewsletterSignupModal />
      </MemoryRouter>,
    );
    // Leave for an ineligible page before the dwell completes...
    act(() => vi.advanceTimersByTime(DWELL_MS / 2));
    fireEvent.click(screen.getByText("to-ineligible"));
    // ...the dwell fires while ineligible, so it stays closed.
    act(() => vi.advanceTimersByTime(DWELL_MS));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Returning to an eligible page opens it immediately (no second dwell).
    fireEvent.click(screen.getByText("to-eligible"));
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });
});
