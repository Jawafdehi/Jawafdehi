import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Article } from "@/types/cms";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const getArticleBySlug = vi.fn();
vi.mock("@/services/cms-api", () => ({
  getArticleBySlug: (...args: unknown[]) => getArticleBySlug(...args),
}));

import UpdateDetail from "@/pages/UpdateDetail";

const article: Article = {
  id: 7,
  meta: { type: "content.ArticlePage", slug: "a-story", first_published_at: null },
  title: "A story headline",
  category: "UPDATE",
  date: "2026-06-24",
  excerpt: "",
  thumbnail: null,
  body: [],
  related_cases: [],
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/updates/a-story"]}>
          <Routes>
            <Route path="/updates/:slug" element={<UpdateDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

beforeEach(() => {
  getArticleBySlug.mockReset();
});

describe("UpdateDetail loading state", () => {
  it("renders the article skeleton instead of a bare loading string", () => {
    // Never settles, so the page stays in its loading state.
    getArticleBySlug.mockReturnValue(new Promise(() => {}));

    const { container } = renderPage();

    expect(screen.queryByText(/^Loading…$/)).toBeNull();
    expect(screen.getByRole("status", { name: "Loading update" })).toBeTruthy();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    // The skip-link target survives the loading state.
    expect(container.querySelector("main#main-content")).toBeTruthy();
  });

  it("replaces the skeleton with the article once it arrives", async () => {
    getArticleBySlug.mockResolvedValue(article);

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "A story headline" })).toBeTruthy(),
    );
    expect(screen.queryByRole("status", { name: "Loading update" })).toBeNull();
  });
});
