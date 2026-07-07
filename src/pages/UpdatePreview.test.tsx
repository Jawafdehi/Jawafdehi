import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Article } from "@/types/cms";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const getArticlePreview = vi.fn();
vi.mock("@/services/cms-api", () => ({
  getArticlePreview: (...args: unknown[]) => getArticlePreview(...args),
}));

import UpdatePreview from "@/pages/UpdatePreview";

const draft: Article = {
  id: 7,
  meta: { type: "content.ArticlePage", slug: "x", first_published_at: null },
  title: "Draft headline",
  category: "UPDATE",
  date: "2026-06-24",
  excerpt: "",
  thumbnail: null,
  body: [],
  related_cases: [],
};

const renderAt = (search: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/updates/preview${search}`]}>
          <UpdatePreview />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

beforeEach(() => {
  getArticlePreview.mockReset();
});

describe("UpdatePreview", () => {
  it("fetches the draft by content_type + token and renders it", async () => {
    getArticlePreview.mockResolvedValue(draft);

    renderAt("?content_type=content.articlepage&token=abc123");

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Draft headline" })).toBeTruthy(),
    );
    expect(getArticlePreview).toHaveBeenCalledWith("content.articlepage", "abc123");
  });

  it("does not fetch and renders NotFound when params are missing", () => {
    renderAt("");

    expect(getArticlePreview).not.toHaveBeenCalled();
    expect(screen.queryByText("Draft headline")).toBeNull();
    expect(screen.getByText("notFound.title")).toBeTruthy();
  });
});
