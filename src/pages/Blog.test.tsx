import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ArticleListItem } from "@/types/cms";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key, i18n: { language: "en" } }),
}));

const getArticles = vi.fn();
vi.mock("@/services/cms-api", () => ({
  getArticles: (...args: unknown[]) => getArticles(...args),
}));

import Blog from "@/pages/Blog";
import { BlogSection, HOME_BLOG_POST_COUNT } from "@/components/home/blog-section";

const wrap = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

const article = (id: number): ArticleListItem => ({
  id,
  meta: { type: "content.ArticlePage", slug: `post-${id}`, first_published_at: null },
  title: `Post ${id}`,
  category: "NEWS",
  date: "2026-06-24",
  excerpt: `Excerpt ${id}.`,
  thumbnail: null,
});

beforeEach(() => {
  getArticles.mockReset();
});

describe("Blog page", () => {
  it("lists every published post, each linking to its article", async () => {
    getArticles.mockResolvedValue([article(1), article(2)]);
    wrap(<Blog />);

    expect(await screen.findByRole("heading", { level: 1, name: "Blog" })).toBeTruthy();
    const link = (await screen.findByText("Post 2")).closest("a");
    expect(link?.getAttribute("href")).toBe("/updates/post-2");
    expect(screen.getByText("Post 1")).toBeTruthy();
  });

  it("says so when nothing is published", async () => {
    getArticles.mockResolvedValue([]);
    wrap(<Blog />);
    expect(await screen.findByText("No blog posts have been published yet.")).toBeTruthy();
  });

  it("says so when the posts fail to load", async () => {
    getArticles.mockRejectedValue(new Error("boom"));
    wrap(<Blog />);
    expect(await screen.findByText("The blog didn't load")).toBeTruthy();
  });
});

describe("Home BlogSection", () => {
  it("shows the two latest posts and links to /blog", async () => {
    getArticles.mockResolvedValue([1, 2, 3, 4, 5].map(article));
    wrap(<BlogSection />);

    expect(await screen.findByText("Post 1")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(HOME_BLOG_POST_COUNT);
    expect(screen.queryByText(`Post ${HOME_BLOG_POST_COUNT + 1}`)).toBeNull();
    expect(screen.getByRole("link", { name: /All blog posts|home\.blog\.viewAll/ }).getAttribute("href")).toBe("/blog/");
    // Each post links to its own page under /blog.
    expect(screen.getAllByRole("link", { name: /Post 1/ })[0].getAttribute("href")).toMatch(/^\/(blog|updates)\//);
  });

  it("renders nothing when there are no posts", async () => {
    getArticles.mockResolvedValue([]);
    const { container } = wrap(<BlogSection />);
    await vi.waitFor(() => expect(getArticles).toHaveBeenCalledWith("BLOG"));
    expect(container.querySelector("section")).toBeNull();
  });
});
