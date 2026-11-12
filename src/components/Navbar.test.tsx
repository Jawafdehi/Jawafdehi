import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Passthrough i18n so assertions key off the translation key, not the copy.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { resolvedLanguage: "ne", language: "ne", changeLanguage: vi.fn() },
  }),
}));

// The command palette pulls in the whole search index; irrelevant here.
vi.mock("@/components/AppSearchCommand", () => ({
  AppSearchCommand: () => null,
}));

import { Navbar } from "@/components/Navbar";

const renderNavbar = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  );

beforeAll(() => {
  // Radix's popper and focus-scope machinery needs browser APIs jsdom lacks.
  // Without these the dropdown and sheet never mount their content.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
});

describe("Navbar — the Open House entry", () => {
  // It lives in the "हाम्रो बारेमा" (about) group, which BOTH the desktop
  // dropdown and the mobile sheet map from one array. These two tests exist
  // because neither renderer appears in the pre-rendered HTML — Radix mounts
  // both only once opened — so a build-output grep cannot verify either one.
  it("appears in the desktop about dropdown", async () => {
    renderNavbar();

    // Opened by keyboard: Enter exercises the keyboard path of the mega menu.
    fireEvent.keyDown(screen.getByRole("button", { name: /nav\.about/ }), { key: "Enter" });

    await waitFor(() => {
      const link = screen
        .getAllByRole("link")
        .find((el) => el.getAttribute("href") === "/openhouse");
      expect(link).toBeTruthy();
      expect(link?.textContent).toContain("nav.openHouse");
    });
  });

  it("appears in the mobile navigation sheet", async () => {
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /nav\.menu/ }));

    await waitFor(() => {
      const links = screen.getAllByRole("link");
      expect(links.some((el) => el.getAttribute("href") === "/openhouse")).toBe(true);
    });
  });
});

describe("Navbar — the Jawafdehi MCP entry", () => {
  // Same shape as the Open House pair above, and for the same reason: the
  // archive group feeds both renderers from one array, and Radix mounts
  // neither until opened, so no build-output grep can see this entry.
  it("appears in the desktop archive dropdown", async () => {
    renderNavbar();

    fireEvent.keyDown(screen.getByRole("button", { name: /Archive/ }), { key: "Enter" });

    await waitFor(() => {
      const link = screen
        .getAllByRole("link")
        .find((el) => el.getAttribute("href") === "/mcp");
      expect(link).toBeTruthy();
      expect(link?.textContent).toContain("Jawafdehi MCP");
    });
  });

  it("appears in the mobile navigation sheet", async () => {
    renderNavbar();

    fireEvent.click(screen.getByRole("button", { name: /nav\.menu/ }));

    await waitFor(() => {
      const links = screen.getAllByRole("link");
      expect(links.some((el) => el.getAttribute("href") === "/mcp")).toBe(true);
    });
  });

  // The menu entry and the active-state path check were two lists of the same
  // paths, and they drifted the moment /mcp was added to only one: the entry
  // appeared, and the Archive trigger went dark on the page it led to. The
  // check is derived from the menu now, and this covers it. /search is the
  // control — without it, a test that stopped exercising the active state at
  // all would still pass.
  //
  // The active item is a pill inside the nav track: white on light pages,
  // full-white text with no fill on the dark heroes (/mcp), where the at-rest
  // header is light-on-dark.
  it.each([
    ["/mcp", "text-primary-foreground"],
    ["/search", "bg-surface"],
  ])("keeps the Archive trigger active on %s", (path, activeClass) => {
    renderNavbar(path);

    const classes = screen.getByRole("button", { name: /Archive/ }).className.split(/\s+/);
    expect(classes).toContain(activeClass);
  });
});
