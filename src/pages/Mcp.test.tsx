import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { CLIENTS, OAUTH_CLIENT_ID } from "@/components/mcp/clients";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      typeof options === "object" && options && "defaultValue" in options
        ? options.defaultValue
        : key,
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));

import Mcp from "@/pages/Mcp";

const renderPage = (path = "/mcp/") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Mcp />
      </MemoryRouter>
    </HelmetProvider>,
  );

beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Mcp hero actions", () => {
  // index.html declares <base href="/" />, so a bare "#install" resolves to the
  // HOME page. That is where both hero buttons used to go.
  it.each([
    ["mcp.hero.primaryCta", "/mcp/#install"],
    ["mcp.hero.secondaryCta", "/mcp/#tools"],
  ])("%s links into this page, not the home page", (name, href) => {
    renderPage("/mcp");
    expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
  });

  it("scrolls to the section in place on a plain click", () => {
    renderPage();
    const link = screen.getByRole("link", { name: "mcp.hero.primaryCta" });
    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(false);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("install");
  });
});

describe("install snippets", () => {
  // The auth server has no dynamic client registration, so a CLI that is not
  // handed the ID cannot sign in at all. The chat apps take a pasted URL.
  it("every CLI client is given the OAuth client ID", () => {
    for (const { key, pasteUrl, command, config } of CLIENTS) {
      if (pasteUrl) continue;
      const carriesId =
        command?.line.includes(OAUTH_CLIENT_ID) || config?.body.includes(OAUTH_CLIENT_ID);
      expect(carriesId, key).toBe(true);
    }
  });

  it("links to the skills repo", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /mcp\.skills\.repoCta/ }).getAttribute("href")).toBe(
      "https://github.com/Jawafdehi/mcp/tree/main/skills",
    );
  });

  it("every config snippet that is JSON parses", () => {
    for (const { config } of CLIENTS) {
      if (config?.path.endsWith(".json")) expect(() => JSON.parse(config.body)).not.toThrow();
    }
  });
});

describe("install copy", () => {
  it.each([
    ["en", en],
    ["ne", ne],
  ])("%s names every client", (_, locale) => {
    const clients = (locale as { mcp: { clients: Record<string, { name?: string }> } }).mcp.clients;
    for (const { key } of CLIENTS) expect(clients[key]?.name, key).toBeTruthy();
  });
});
