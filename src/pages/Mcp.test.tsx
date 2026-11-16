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
// and a support contact, in both languages. On the redesigned page the example
// prompts are the "questions" carousel and sign-in/help are McpAccess.

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
    expect(document.getElementById("questions")).toBeTruthy();
    const items = (lng === "en" ? en : ne).mcp.questions.items;
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("links the support email, the feedback page and the privacy section", async () => {
    await i18n.changeLanguage("en");
    renderPage();
    // Help and the pilot's contact both carry it; every one must be a mailto.
    const emails = screen.getAllByRole("link", { name: "inquiry@jawafdehi.org" });
    expect(emails.length).toBeGreaterThan(0);
    for (const link of emails) expect(link.getAttribute("href")).toBe("mailto:inquiry@jawafdehi.org");
    expect(screen.getByRole("link", { name: en.mcp.support.feedbackLink }).getAttribute("href")).toBe(
      "/feedback",
    );
    expect(screen.getByRole("link", { name: en.mcp.signIn.privacyLink }).getAttribute("href")).toBe(
      "/privacy#ai-assistants",
    );
  });

  it("no longer tells ChatGPT users to turn on developer mode", () => {
    expect(en.mcp.connect.clients.chatgpt.steps.join(" ").toLowerCase()).not.toContain("developer mode");
    expect(ne.mcp.connect.clients.chatgpt.steps.join(" ")).not.toContain("डेभलपर मोड");
  });

  it("says every tool needs a free account, and never that none is needed", () => {
    // JAW-42/JAW-52: the connector needs sign-in.
    expect(en.mcp.signIn.body).toContain("free Jawafdehi account");
    for (const text of [en.mcp.meta.description, ...en.mcp.connect.clients.chatgpt.steps]) {
      expect(text.toLowerCase()).not.toContain("no account");
      expect(text).not.toContain("No authentication");
    }
  });

  it("has the same example count in both languages", () => {
    expect(ne.mcp.questions.items).toHaveLength(en.mcp.questions.items.length);
  });
});
