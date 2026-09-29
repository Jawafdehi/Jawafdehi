import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/openhouse/"]}>
        <OpenHouse />
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  // Radix's Checkbox in the signup form measures itself on mount.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
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
    const register = screen.getByRole("link", { name: /openHouse\.hero\.register/ });

    expect(register.getAttribute("href")).toBe("/openhouse/#signup");
    // The whole point: a bare "#signup" would leave the page.
    expect(register.getAttribute("href")).not.toBe("#signup");
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

  it("renders the section Register scrolls to", () => {
    const { container } = renderPage();
    const target = container.querySelector("#signup");

    expect(target).toBeTruthy();
    // scroll-mt clears the sticky navbar, which would otherwise cover the
    // heading the anchor jumps to.
    expect(target?.className).toContain("scroll-mt");
  });
});
