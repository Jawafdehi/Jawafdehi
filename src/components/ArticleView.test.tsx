import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ArticleView } from "@/components/ArticleView";
import type { Article } from "@/types/cms";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const article: Article = {
  id: 7,
  meta: {
    type: "content.ArticlePage",
    slug: "draft-article",
    first_published_at: null,
  },
  title: "Draft headline",
  category: "UPDATE",
  date: "2026-06-24",
  excerpt: "Draft excerpt",
  thumbnail: null,
  body: [
    { type: "heading", value: "A section", id: "b1" },
    { type: "paragraph", value: "<p>Body paragraph</p>", id: "b2" },
  ],
  related_cases: [
    { id: 3, title: "Related case title", slug: "a-case" },
  ],
};

describe("ArticleView", () => {
  it("renders the title, formatted date, body blocks and related cases", () => {
    render(
      <MemoryRouter>
        <ArticleView article={article} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Draft headline" }),
    ).toBeTruthy();
    expect(screen.getByText("June 24, 2026")).toBeTruthy();
    // StreamField content (heading + rich-text paragraph) renders.
    expect(screen.getByText("A section")).toBeTruthy();
    expect(screen.getByText("Body paragraph")).toBeTruthy();
    // Related case links to the public case page.
    const caseLink = screen.getByText("Related case title").closest("a");
    expect(caseLink?.getAttribute("href")).toBe("/case/a-case");
  });

  it("omits the related-cases section when there are none", () => {
    render(
      <MemoryRouter>
        <ArticleView article={{ ...article, related_cases: [] }} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Related cases")).toBeNull();
  });

  it("renders the featured image when a thumbnail is set", () => {
    render(
      <MemoryRouter>
        <ArticleView
          article={{
            ...article,
            thumbnail: {
              url: "https://s3.example.org/thumb.png",
              width: 800,
              height: 450,
              alt: "पशुपतिनाथको जलहरी",
            },
          }}
        />
      </MemoryRouter>,
    );
    const img = screen.getByRole("img", { name: "पशुपतिनाथको जलहरी" });
    expect(img.getAttribute("src")).toBe("https://s3.example.org/thumb.png");
    // The image description doubles as the visible caption.
    expect(screen.getByText("पशुपतिनाथको जलहरी").tagName).toBe("FIGCAPTION");
  });

  it("prefers the large rendition for the hero, which renders at 896px wide", () => {
    render(
      <MemoryRouter>
        <ArticleView
          article={{
            ...article,
            thumbnail: {
              url: "https://s3.example.org/thumb.800x450.webp",
              width: 800,
              height: 450,
              alt: "पशुपतिनाथको जलहरी",
            },
            thumbnail_large: {
              url: "https://s3.example.org/thumb.1600x900.webp",
              width: 1600,
              height: 900,
              alt: "पशुपतिनाथको जलहरी",
            },
          }}
        />
      </MemoryRouter>,
    );
    const img = screen.getByRole("img", { name: "पशुपतिनाथको जलहरी" });
    expect(img.getAttribute("src")).toBe(
      "https://s3.example.org/thumb.1600x900.webp",
    );
    // Intrinsic size must track the rendition actually served, or the reserved
    // box no longer matches and the layout shifts on load.
    expect(img.getAttribute("width")).toBe("1600");
    expect(img.getAttribute("height")).toBe("900");
  });

  it("falls back to the card rendition when the API has no large one", () => {
    // The window where the frontend has deployed but the API field has not.
    render(
      <MemoryRouter>
        <ArticleView
          article={{
            ...article,
            thumbnail: {
              url: "https://s3.example.org/thumb.800x450.webp",
              width: 800,
              height: 450,
              alt: "पशुपतिनाथको जलहरी",
            },
          }}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("img", { name: "पशुपतिनाथको जलहरी" }).getAttribute("src"),
    ).toBe("https://s3.example.org/thumb.800x450.webp");
  });

  it("renders no featured image when the thumbnail is null", () => {
    render(
      <MemoryRouter>
        <ArticleView article={{ ...article, thumbnail: null }} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("img")).toBeNull();
  });
});
