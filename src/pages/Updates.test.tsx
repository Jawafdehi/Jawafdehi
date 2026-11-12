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
  it("shows a bento-shaped skeleton, announced once", () => {
    renderPage();
    const status = loadingStatus();
    const tiles = status.querySelectorAll("[data-skeleton]");
    expect(tiles.length).toBe(6);
    // The first placeholder takes the lead story's two-column cell.
    expect(tiles[0].className).toContain("md:col-span-2");
    expect(status.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});

describe("Updates bento feed", () => {
  it("leads with the newest story across two columns of one row", async () => {
    getArticles.mockResolvedValue([article(1, { thumbnail: picture }), article(2), article(3)]);
    renderPage();

    const lead = (await screen.findByText("Story 1")).closest("a");
    expect(lead?.getAttribute("data-shape")).toBe("lead");
    expect(lead?.parentElement?.className).toContain("md:col-span-2");
    // One row only: a two-row cell stretched the lead's picture out of 16:9.
    expect(lead?.parentElement?.className).not.toContain("row-span");
  });

  it("gives a story with a picture an image tile and one without a text panel", async () => {
    getArticles.mockResolvedValue([article(1), article(2, { thumbnail: picture }), article(3)]);
    renderPage();

    await screen.findByText("Story 1");
    expect(screen.getByText("Story 2").closest("a")?.getAttribute("data-shape")).toBe("picture");
    expect(screen.getByText("Story 3").closest("a")?.getAttribute("data-shape")).toBe("text");
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
    const className = container.querySelector("ul.grid")?.className ?? "";
    expect(className).toContain("md:grid-cols-2");
    expect(className).toContain("lg:grid-cols-3");
  });
});
