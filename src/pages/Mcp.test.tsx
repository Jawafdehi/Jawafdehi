import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import i18n from "@/i18n/config";
import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import Mcp from "@/pages/Mcp";

// The /mcp page is the connector's public documentation for the Claude and
// ChatGPT directory listings (JAW-52): install steps, sign-in, example prompts
// and a support contact, in both languages.

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Mcp />
      </MemoryRouter>
    </HelmetProvider>,
  );

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("ne");
});

describe("Mcp page", () => {
  it.each(["en", "ne"] as const)("shows at least three example prompts in %s", async (lng) => {
    await i18n.changeLanguage(lng);
    renderPage();
    const items = within(document.getElementById("examples") as HTMLElement).getAllByRole(
      "listitem",
    );
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("links the support email, the feedback page and the privacy section", async () => {
    await i18n.changeLanguage("en");
    renderPage();
    expect(
      screen.getByRole("link", { name: "inquiry@jawafdehi.org" }).getAttribute("href"),
    ).toBe("mailto:inquiry@jawafdehi.org");
    expect(screen.getByRole("link", { name: en.mcp.support.feedbackLink }).getAttribute("href")).toBe(
      "/feedback",
    );
    expect(screen.getByRole("link", { name: en.mcp.signIn.privacyLink }).getAttribute("href")).toBe(
      "/privacy#ai-assistants",
    );
  });

  it("no longer tells ChatGPT users to turn on developer mode", () => {
    expect(en.mcp.clients.openai.appSteps.toLowerCase()).not.toContain("developer mode");
    expect(ne.mcp.clients.openai.appSteps).not.toContain("डेभलपर मोड");
  });

  it("has the same example count in both languages", () => {
    expect(ne.mcp.examples.items).toHaveLength(en.mcp.examples.items.length);
  });
});
