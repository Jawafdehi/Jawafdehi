import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CookieConsentBanner } from "@/components/CookieConsentBanner";

// Passthrough i18n so assertions read the English defaults rather than depending
// on translation resources. <Trans> renders its `defaults` with the markup tags
// stripped, which is enough to tell the long and short copy apart.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
  Trans: ({ defaults, i18nKey }: { defaults?: string; i18nKey: string }) => (
    <>{(defaults ?? i18nKey).replace(/<\/?[a-z]+>/g, "")}</>
  ),
}));

// The banner is suppressed on dev/localhost hosts, where GA never loads.
vi.mock("@/lib/telemetry", () => ({ telemetryAllowedHere: () => true }));
vi.mock("@/lib/ga", () => ({ loadGoogleAnalytics: vi.fn() }));

const BANNER_HEIGHT = 109;

/**
 * These tests guard a layout bug on a 360 x 640 budget Android, where the bar
 * stood 201px tall — 31% of the viewport — and hid every search result behind a
 * cookie notice. jsdom has no layout engine, so the height itself cannot be
 * asserted here (it was measured in a real browser instead: 201px before, 109px
 * after). What the tests below pin are the three things that decide that height
 * — which copy renders, whether the text column is squeezed by `container`, and
 * whether the bar's own height is reserved at the foot of the document.
 */
describe("CookieConsentBanner", () => {
  let narrow = false;
  let originalOffsetHeight: PropertyDescriptor | undefined;

  const renderBanner = () =>
    render(
      <MemoryRouter>
        <CookieConsentBanner />
      </MemoryRouter>,
    );

  const longCopy = /We use cookies that are necessary for the site to work/;
  const shortCopy = /Analytics cookies are used only if you accept/;

  beforeEach(() => {
    window.localStorage.clear();
    narrow = false;

    window.matchMedia = ((query: string) => ({
      get matches() {
        return narrow;
      },
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    // jsdom reports every element as 0px tall; give the bar a height so the
    // space it reserves is a number the assertions can distinguish from "unset".
    originalOffsetHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight",
    );
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => BANNER_HEIGHT,
    });
  });

  afterEach(() => {
    if (originalOffsetHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetHeight",
        originalOffsetHeight,
      );
    }
    document.body.style.paddingBottom = "";
  });

  it("swaps in shorter copy on a narrow viewport", () => {
    narrow = true;
    renderBanner();

    // Six wrapped lines of the desktop paragraph were most of the 201px.
    expect(screen.getByText(shortCopy)).toBeTruthy();
    expect(screen.queryByText(longCopy)).toBeNull();
    // "Accept analytics" wraps the button to two lines in Nepali at 360px, so
    // the visible label shortens — but the accessible name must still say what
    // is being accepted.
    const accept = screen.getByRole("button", { name: "Accept analytics" });
    expect(accept.textContent).toBe("Accept");
  });

  it("keeps the full explanation where there is room for it", () => {
    narrow = false;
    renderBanner();

    expect(screen.getByText(longCopy)).toBeTruthy();
    expect(screen.queryByText(shortCopy)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Accept analytics" }),
    ).toBeTruthy();
  });

  it("does not squeeze the text column with `container`", () => {
    narrow = true;
    renderBanner();

    // `container` carries 2rem of side padding in this project's Tailwind
    // config. On a 360px screen that is 64px, on top of the bar's own padding,
    // leaving a 264px text column that forced the copy to wrap further.
    const bar = screen.getByRole("dialog");
    const wrapper = bar.firstElementChild?.className ?? "";
    expect(wrapper).not.toContain("container");
    // The bar's own padding tightens on small screens too.
    expect(bar.className).toContain("p-3");
    expect(bar.className).toContain("sm:p-4");
    // Above `sm` the wrapper still has to reproduce what `container` gave the
    // desktop bar — its 2rem side padding and its 1400px cap — so this stays a
    // phone-only change.
    expect(wrapper).toContain("sm:px-8");
    expect(wrapper).toContain("max-w-[1400px]");
  });

  it("reserves its height at the foot of the page, and releases it on dismiss", () => {
    narrow = true;
    renderBanner();

    // Without this the last screenful of results stays under the fixed overlay
    // however far the visitor scrolls.
    expect(document.body.style.paddingBottom).toBe(`${BANNER_HEIGHT}px`);

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.paddingBottom).toBe("");
  });
});
