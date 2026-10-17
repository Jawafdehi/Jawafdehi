import { act, render, screen } from "@testing-library/react";
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

    // Two of them: the hero button and the closing call to action.
    const benchmark = screen.getAllByRole("link", { name: /benchmark/i });
    expect(benchmark).toHaveLength(2);
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

  // Everything in src/pages/likhit.css is written as `.likhit-page .lk-*`. If the
  // page stopped rendering that wrapper the whole stylesheet would silently stop
  // applying, and the page would fall back to unstyled markup inside the site
  // chrome — which still renders, still passes every other assertion here, and
  // looks obviously wrong only to a human.
  it("scopes itself under .likhit-page so the ported stylesheet applies", async () => {
    const { container } = await renderPage("en");

    const page = container.querySelector(".likhit-page");
    expect(page).not.toBeNull();
    // Every styled element has to be inside it, not a sibling.
    expect(container.querySelectorAll("[class*='lk-']").length).toBeGreaterThan(0);
    for (const el of container.querySelectorAll("[class*='lk-']")) {
      expect(page?.contains(el)).toBe(true);
    }
  });

  it("lists the four features as rows, in the order their colours are keyed to", async () => {
    const { container } = await renderPage("en");

    // likhit.css colours the square before each row by :nth-child, so the order
    // here is load-bearing — reordering them re-colours them.
    const rows = [...container.querySelectorAll(".lk-features li strong")];
    expect(rows.map((el) => el.textContent)).toEqual([
      i18n.t("likhit.features.repair.name"),
      i18n.t("likhit.features.layout.name"),
      i18n.t("likhit.features.ocr.name"),
      i18n.t("likhit.features.legacy.name"),
    ]);
  });

  it("gives every OCR recipe a copyable block", async () => {
    const { container } = await renderPage("en");

    // One per recipe: a model on your own machine, Bedrock, a hosted API.
    expect(
      screen.getAllByRole("button", { name: i18n.t("likhit.ocr.copyRecipe") }),
    ).toHaveLength(3);
    expect(container.textContent).toContain("ollama pull qwen2.5vl:7b");
    expect(container.textContent).toContain("litellm --model bedrock");
    expect(container.textContent).toContain("GEMINI_API_KEY");
  });

  // A <Trans> tag that the locale file spells differently from the page's
  // `components` map does not throw — i18next renders the placeholder as literal
  // text. So the failure mode is "<cmd>likhit-save</cmd>" shipped to a reader,
  // which only an assertion on the rendered text can catch. Nepali is checked
  // too: its sentences reorder the tags, which is exactly where a typo hides.
  it.each(["en", "ne"] as const)("resolves every Trans placeholder in %s", async (language) => {
    const { container } = await renderPage(language);

    const text = container.textContent ?? "";
    const tags = ["name", "doc", "markitdown", "api", "cli", "cmd", "baseUrl", "apiKey", "model"];
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
