import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ArticleListItem } from "@/types/cms";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const getArticles = vi.fn();
vi.mock("@/services/cms-api", () => ({
  getArticles: (...args: unknown[]) => getArticles(...args),
}));

import Updates from "@/pages/Updates";

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/updates"]}>
          <Updates />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

// One skeleton card = one aria-hidden root carrying the view mode.
const skeletonCards = (root: HTMLElement, viewMode: "cards" | "list") =>
  root.querySelectorAll(`[aria-hidden='true'][data-view='${viewMode}']`).length;

const loadingStatus = () => screen.getByRole("status", { name: "Loading updates" });

beforeEach(() => {
  getArticles.mockReset();
  // Never settles, so the page stays in its loading state for the assertions.
  getArticles.mockReturnValue(new Promise(() => {}));
});

describe("Updates loading state", () => {
  it("renders card skeletons instead of a bare loading string", () => {
    const { container } = renderPage();

    expect(screen.queryByText(/^Loading updates…$/)).toBeNull();
    expect(skeletonCards(loadingStatus(), "cards")).toBe(6);
    // The shapes pulse via the shared <Skeleton> primitive.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("swaps to list-shaped skeletons when the list view is selected", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(skeletonCards(loadingStatus(), "list")).toBe(3);
    expect(skeletonCards(loadingStatus(), "cards")).toBe(0);
  });

  it("announces the load once and hides the decorative shapes", () => {
    renderPage();

    const status = loadingStatus();
    // The status node carries the announcement; the placeholder cards inside it
    // are hidden so a screen reader doesn't walk an empty card tree.
    expect(status.getAttribute("aria-hidden")).toBeNull();
    expect(skeletonCards(status, "cards")).toBe(6);
  });

  it("keeps the skeleton grid on the same layout as the loaded grid", () => {
    renderPage();

    expect(loadingStatus().className).toContain("md:grid-cols-2");
  });
});

describe("Updates card grid sizing", () => {
  const article = (id: number, excerpt: string): ArticleListItem => ({
    id,
    meta: { type: "content.ArticlePage", slug: `story-${id}`, first_published_at: null },
    title: `Story ${id}`,
    category: "UPDATE",
    date: "2026-06-24",
    excerpt,
    thumbnail: null,
  });

  // Deliberately uneven copy: this is the input that used to produce short cards
  // in one row and tall ones in the next.
  const articles = [
    article(1, "Short."),
    article(2, "A considerably longer excerpt that wraps onto several lines in the card grid."),
    article(3, "Medium length excerpt."),
  ];

  // The results grid, not the `grid place-items-center` icon box inside a
  // thumbnail-less card (and not the loading <output>, which isn't a div).
  const grid = (container: HTMLElement) =>
    container.querySelector<HTMLElement>("div.grid.gap-6, div.grid.gap-5");

  it("equalises every row in card view, not just the cells within one row", async () => {
    getArticles.mockResolvedValue(articles);

    const { container } = renderPage();

    await screen.findByText("Story 1");
    // `auto-rows-fr` is what makes rows uniform; without it a grid only equalises
    // cells inside a single row.
    expect(grid(container)?.className).toContain("auto-rows-fr");
  });

  it("uses the canonical /cases breakpoints", async () => {
    getArticles.mockResolvedValue(articles);

    const { container } = renderPage();

    await screen.findByText("Story 1");
    const className = grid(container)?.className ?? "";
    expect(className).toContain("md:grid-cols-2");
    expect(className).toContain("lg:grid-cols-3");
    expect(className).not.toContain("xl:grid-cols-3");
  });

  it("leaves list view alone — equal rows there would pad out short entries", async () => {
    getArticles.mockResolvedValue(articles);

    const { container } = renderPage();

    await screen.findByText("Story 1");
    fireEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(grid(container)?.className).not.toContain("auto-rows-fr");
  });
});
