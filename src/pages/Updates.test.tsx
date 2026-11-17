import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ArticleListItem } from "@/types/cms";
import { WHATS_NEW } from "@/data/whats-new";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const getArticles = vi.fn();
vi.mock("@/services/cms-api", () => ({
  getArticles: (...args: unknown[]) => getArticles(...args),
}));

import Updates from "@/pages/Updates";

const renderPage = (url = "/updates") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <Updates />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const loadingStatus = () => screen.getByRole("status", { name: "Loading updates" });

beforeEach(() => {
  getArticles.mockReset();
  // Never settles, so the page stays in its loading state for the assertions.
  getArticles.mockReturnValue(new Promise(() => {}));
});

const article = (
  id: number,
  over: Partial<ArticleListItem> = {},
): ArticleListItem => ({
  id,
  meta: { type: "content.ArticlePage", slug: `story-${id}`, first_published_at: null },
  title: `Story ${id}`,
  category: "UPDATE",
  date: "2026-06-24",
  excerpt: `Excerpt ${id}.`,
  thumbnail: null,
  ...over,
});

const picture = { url: "https://cms.example.test/p.jpg", width: 800, height: 450, alt: "" };

describe("Updates loading state", () => {
  it("shows a grid of skeleton stories, announced once", () => {
    renderPage();
    const status = loadingStatus();
    expect(status.querySelectorAll("[data-skeleton]").length).toBe(6);
    expect(status.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});

describe("Updates feed", () => {
  it("gives every story the same cell, with or without a picture", async () => {
    getArticles.mockResolvedValue([article(1), article(2, { thumbnail: picture }), article(3)]);
    renderPage();

    await screen.findByText("Story 1");
    expect(screen.getByText("Story 2").closest("a")?.getAttribute("data-shape")).toBe("picture");
    expect(screen.getByText("Story 3").closest("a")?.getAttribute("data-shape")).toBe("text");
    // An even grid: no story spans more than one cell.
    for (const item of document.querySelectorAll('ul[data-feed="articles"] > li')) {
      expect(item.className).not.toContain("span");
    }
  });

  it("filters to news or updates with the switcher pills", async () => {
    getArticles.mockResolvedValue([article(1), article(2, { category: "NEWS" })]);
    renderPage();

    await screen.findByText("Story 1");
    fireEvent.click(screen.getByRole("button", { name: "News" }));
    expect(screen.queryByText("Story 1")).toBeNull();
    expect(screen.getByText("Story 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByText("Story 1")).toBeTruthy();
  });

  it("uses the canonical /cases breakpoints", async () => {
    getArticles.mockResolvedValue([article(1), article(2), article(3)]);
    const { container } = renderPage();

    await screen.findByText("Story 1");
    const className = container.querySelector('ul[data-feed="articles"]')?.className ?? "";
    expect(className).toContain("md:grid-cols-2");
    expect(className).toContain("lg:grid-cols-3");
  });
});

// The platform changelog (src/data/whats-new.ts) lives here too: a bento band in
// "All", the whole of it under ?filter=whats-new (where /whats-new redirects).
describe("Updates — What's new", () => {
  it("shows the changelog as a bento band above the articles in All", async () => {
    getArticles.mockResolvedValue([article(1)]);
    const { container } = renderPage();

    await screen.findByText("Story 1");
    const bento = container.querySelector('ul[data-feed="whats-new"]');
    expect(bento?.querySelectorAll(":scope > li").length).toBe(Math.min(5, WHATS_NEW.length));
    // Each tile opens its own post.
    expect(bento?.querySelector("a")?.getAttribute("href")).toMatch(/^\/updates\/whats-new\//);
    // The band comes first, the articles after it.
    const feeds = [...container.querySelectorAll("ul[data-feed]")].map((ul) => ul.getAttribute("data-feed"));
    expect(feeds).toEqual(["whats-new", "articles"]);
  });

  it("shows every entry and no articles under ?filter=whats-new", async () => {
    getArticles.mockResolvedValue([article(1)]);
    const { container } = renderPage("/updates?filter=whats-new");

    await screen.findAllByRole("link");
    expect(container.querySelectorAll('ul[data-feed="whats-new"] > li').length).toBe(WHATS_NEW.length);
    expect(container.querySelector('ul[data-feed="articles"]')).toBeNull();
    expect(screen.getByRole("button", { name: "What's new" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("narrows to one product with ?tag=", async () => {
    const { container } = renderPage("/updates?filter=whats-new&tag=mcp");
    const expected = WHATS_NEW.filter((entry) => entry.tags.includes("mcp")).length;
    expect(container.querySelectorAll('ul[data-feed="whats-new"] > li').length).toBe(expected);
  });

  it("leaves the changelog out of News and Updates", async () => {
    getArticles.mockResolvedValue([article(1, { category: "NEWS" })]);
    const { container } = renderPage("/updates?filter=news");
    await screen.findByText("Story 1");
    expect(container.querySelector('ul[data-feed="whats-new"]')).toBeNull();
  });
});
