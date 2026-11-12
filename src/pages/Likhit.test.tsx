import { act, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

// The real i18n instance, not a stub. The point of this suite is that the
// shipped locale strings and the <Trans> component maps in the page agree, and
// a stubbed `t` that echoes keys could never catch a disagreement.
import i18n from "@/i18n/config";
import Likhit from "@/pages/Likhit";

const BENCHMARK_URL = "https://jawafdehi.github.io/likhit/";

// This repo registers no jest-dom matchers, so assertions here read plain DOM
// properties rather than reaching for toBeInTheDocument/toHaveAttribute.
const renderPage = async (language: "en" | "ne") => {
  // i18n is module-global, so the switch re-renders anything already mounted.
  // act() keeps that out of the warning stream — the language has to be in
  // place before render, so it cannot simply happen inside one.
  await act(async () => {
    await i18n.changeLanguage(language);
  });

  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Likhit />
      </MemoryRouter>
    </HelmetProvider>,
  );
};

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("ne");
  });
});

describe("the likhit landing page", () => {
  it("shows the install command and offers it for copying", async () => {
    const { container } = await renderPage("en");

    expect(container.textContent).toContain("pip install likhit");
    expect(
      screen.queryByRole("button", { name: i18n.t("likhit.install.copyLabel") }),
    ).not.toBeNull();
  });

  it("sends readers to the benchmark and the repository, in a new tab", async () => {
    await renderPage("en");

    // Exactly one, in the intro link row. The benchmark gets a link, not a
    // section of its own — this page is the landing page and the measurements
    // live on GitHub Pages.
    const benchmark = screen.getAllByRole("link", { name: /benchmark/i });
    expect(benchmark).toHaveLength(1);
    for (const link of benchmark) {
      expect(link.getAttribute("href")).toBe(BENCHMARK_URL);
      expect(link.getAttribute("target")).toBe("_blank");
      // Without it, the opened tab can reach back through window.opener.
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }

    expect(
      screen.getByRole("link", { name: /source on github/i }).getAttribute("href"),
    ).toBe("https://github.com/Jawafdehi/likhit");
  });

  it("lists the four features, in order", async () => {
    await renderPage("en");

    const section = screen.getByRole("region", { name: i18n.t("likhit.features.title") });
    const names = within(section).getAllByRole("heading", { level: 3 }).map((el) => el.textContent);
    expect(names).toEqual([
      i18n.t("likhit.features.repair.name"),
      i18n.t("likhit.features.layout.name"),
      i18n.t("likhit.features.ocr.name"),
      i18n.t("likhit.features.legacy.name"),
    ]);
  });

  it("shows the released version, and links it to the changelog", async () => {
    await renderPage("en");

    const version = screen.getByRole("link", { name: /likhit v0\.2\.0/ });
    expect(version.getAttribute("href")).toBe("https://github.com/Jawafdehi/likhit/blob/main/CHANGELOG.md");
    expect(version.getAttribute("target")).toBe("_blank");
  });

  it("names all four redaction tiers, least-removed first", async () => {
    const { container } = await renderPage("en");

    const tiers = [...container.querySelectorAll("#likhit-tiers-title ~ dl dt code")];
    expect(tiers.map((el) => el.textContent)).toEqual(["none", "identifiers", "contact", "strict"]);
  });

  it("gives every likhit-redact command its required arguments", async () => {
    await renderPage("en");

    const group = screen.getByRole("group", { name: i18n.t("likhit.privacy.commandsTitle") });
    const commands = [...group.querySelectorAll("code")].map((el) => el.textContent ?? "");
    expect(commands).toHaveLength(3);
    for (const command of commands) {
      expect(command.startsWith("likhit-redact ")).toBe(true);
      expect(command).toContain("--out");
      if (!command.includes(" scan ")) expect(command).toContain("--journal ");
    }
  });

  it("gives every OCR recipe a card with a copyable setup", async () => {
    await renderPage("en");

    const section = screen.getByRole("region", { name: i18n.t("likhit.ocr.title") });
    const cards = within(section).getAllByRole("article");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.querySelector("p")?.textContent)).toEqual([
      i18n.t("likhit.ocr.local.badge"),
      i18n.t("likhit.ocr.bedrock.badge"),
      i18n.t("likhit.ocr.hosted.badge"),
    ]);
    expect(within(section).getAllByRole("button", { name: i18n.t("likhit.ocr.copyRecipe") })).toHaveLength(3);
    expect(section.textContent).toContain("ollama pull qwen2.5vl:7b");
    expect(section.textContent).toContain("litellm --model bedrock");
    expect(section.textContent).toContain("GEMINI_API_KEY");
  });

  // A <Trans> tag that the locale file spells differently from the page's
  // `components` map does not throw — i18next renders the placeholder as literal
  // text. So the failure mode is "<cmd>likhit-save</cmd>" shipped to a reader,
  // which only an assertion on the rendered text can catch. Nepali is checked
  // too: its sentences reorder the tags, which is exactly where a typo hides.
  it.each(["en", "ne"] as const)("resolves every Trans placeholder in %s", async (language) => {
    const { container } = await renderPage(language);

    const text = container.textContent ?? "";
    const tags = [
      "name", "doc", "markitdown", "api", "cli", "cmd",
      "baseUrl", "apiKey", "model", "pkg", "opt", "tier",
    ];
    for (const tag of tags) {
      expect(text).not.toContain(`<${tag}>`);
      expect(text).not.toContain(`</${tag}>`);
    }
  });

  it("translates the page rather than falling back to the keys", async () => {
    const { container } = await renderPage("ne");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      i18n.t("likhit.hero.titleAccent"),
    );
    expect(container.textContent).not.toContain("likhit.hero.");
    // The install command is a shell command, not prose — it stays in English.
    expect(container.textContent).toContain("pip install likhit");
  });
});
