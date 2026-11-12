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
    await renderPage("en");

    const section = screen.getByRole("region", { name: i18n.t("likhit.privacy.title") });
    const tiers = [...section.querySelectorAll("dl dt code")];
    expect(tiers.map((el) => el.textContent)).toEqual(["none", "identifiers", "contact", "strict"]);
  });

  it("gives each command-line case its own copyable command", async () => {
    await renderPage("en");

    const section = screen.getByRole("region", { name: i18n.t("likhit.cli.title") });
    expect(within(section).getAllByRole("button", { name: i18n.t("likhit.cli.copyCommand") })).toHaveLength(5);
    expect(section.textContent).toContain("likhit-save notice.pdf --out notice.md");
    expect(section.textContent).toContain("--redact none");
  });

  it("switches between the three OCR recipes, one at a time", async () => {
    await renderPage("en");

    const section = screen.getByRole("region", { name: i18n.t("likhit.ocr.title") });
    const pills = within(section).getAllByRole("button", { pressed: false }).concat(
      within(section).getAllByRole("button", { pressed: true }),
    );
    expect(pills).toHaveLength(3);
    expect(within(section).getAllByRole("button", { name: i18n.t("likhit.ocr.copyRecipe") })).toHaveLength(1);
    // Every setup is rendered (so the card keeps one size); only the active
    // one is exposed.
    const shown = () => section.querySelector('[data-active="true"]')?.textContent ?? "";
    expect(shown()).toContain("ollama pull qwen2.5vl:7b");

    act(() => {
      within(section).getByRole("button", { name: i18n.t("likhit.ocr.bedrock.name") }).click();
    });
    expect(shown()).toContain("litellm --model bedrock");
    expect(shown()).not.toContain("ollama pull");

    act(() => {
      within(section).getByRole("button", { name: i18n.t("likhit.ocr.hosted.name") }).click();
    });
    expect(shown()).toContain("GEMINI_API_KEY");
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
