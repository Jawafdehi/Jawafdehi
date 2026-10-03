import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { resolvedLanguage: "ne", language: "ne" },
  }),
}));

vi.mock("@/services/jds-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/jds-api")>("@/services/jds-api");
  return { ...actual, subscribeToNewsletter: vi.fn() };
});

import OpenHouse from "@/pages/OpenHouse";

const renderPage = (path = "/openhouse/") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <OpenHouse />
      </MemoryRouter>
    </HelmetProvider>,
  );

const registerLink = () => screen.getByRole("link", { name: /openHouse\.hero\.register/ });

beforeEach(() => {
  // Radix's Checkbox in the signup form measures itself on mount.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  // Reset per test: the reduced-motion case replaces this, and a leaked
  // "matches: true" would silently turn the smooth-scroll assertion green
  // for the wrong reason.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;

  Element.prototype.scrollIntoView = () => {};
});

describe("OpenHouse hero actions", () => {
  // 🚨 The regression this file exists for. index.html declares
  // <base href="/" />, and a fragment-only URL resolves against the document
  // BASE rather than the current page — so href="#signup" silently navigates to
  // the home page instead of scrolling down. It shipped to a preview deploy
  // exactly that way, and nothing caught it: the markup looks right, the anchor
  // target exists, and every test passed.
  it("points Register at this page's own path, never a bare fragment", () => {
    renderPage();

    expect(registerLink().getAttribute("href")).toBe("/openhouse/#signup");
    // The whole point: a bare "#signup" would leave the page.
    expect(registerLink().getAttribute("href")).not.toBe("#signup");
  });

  // ⚠️ The page is reachable BOTH ways: "/openhouse" when React Router handles
  // it from the nav menu, and "/openhouse/" on a direct hit. The href must be
  // stable across the two, because the pre-render emits the unslashed form and
  // the browser hydrates on the slashed one — echoing the pathname verbatim
  // would change the attribute during hydration.
  it("emits the same href whichever way the page was reached", () => {
    renderPage("/openhouse");
    expect(registerLink().getAttribute("href")).toBe("/openhouse/#signup");

    cleanup();

    renderPage("/openhouse/");
    expect(registerLink().getAttribute("href")).toBe("/openhouse/#signup");
  });

  it("keeps the Zoom room reachable alongside Register", () => {
    // The room is a "No Fixed Time" meeting with a permanent link, so someone
    // arriving mid-session must always be able to join. Register leading must
    // not mean the join path disappeared.
    renderPage();
    // Matched on the i18n key: the mock above renders keys, not English copy.
    const join = screen.getByRole("link", { name: /openHouse\.hero\.join/ });

    expect(join.getAttribute("href")).toContain("zoom.us");
    expect(join.getAttribute("target")).toBe("_blank");
    expect(join.getAttribute("rel")).toContain("noopener");
  });

  it("smooth-scrolls to the form instead of navigating", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderPage();

    const event = createEvent.click(registerLink());
    fireEvent(registerLink(), event);

    expect(event.defaultPrevented).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("jumps rather than animating when the reader prefers reduced motion", () => {
    // A scroll this long is a vestibular trigger, so the animation is opt-out.
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    renderPage();
    fireEvent.click(registerLink());

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("leaves a ctrl/cmd-click alone so it can open in a new tab", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderPage();

    const event = createEvent.click(registerLink(), { ctrlKey: true });
    fireEvent(registerLink(), event);

    expect(event.defaultPrevented).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("renders the section Register scrolls to", () => {
    const { container } = renderPage();
    const target = container.querySelector("#signup");

    expect(target).toBeTruthy();
    // scroll-mt clears the sticky navbar, which would otherwise cover the
    // heading the anchor jumps to.
    expect(target?.className).toContain("scroll-mt");
  });
});
