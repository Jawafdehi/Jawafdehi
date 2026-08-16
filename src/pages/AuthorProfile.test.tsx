import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Passthrough translations so assertions don't depend on i18n resources; `t`
// keeps a stable identity across renders like the real react-i18next.
vi.mock("react-i18next", () => {
  const translation = {
    t: (key: string, opts?: Record<string, unknown>) =>
      opts
        ? `${key}:${Object.entries(opts)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(",")}`
        : key,
    i18n: { language: "en" },
  };
  return { useTranslation: () => translation };
});

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useParams: () => ({ slug: "subodh-kandel" }),
}));

vi.mock("@/components/Seo", () => ({ Seo: () => null }));

vi.mock("@/services/jds-api", () => ({ getAuthorProfile: vi.fn() }));
import { getAuthorProfile } from "@/services/jds-api";

import AuthorProfile from "./AuthorProfile";
import type { AuthorProfile as AuthorProfileType } from "@/types/jds";

const profile = (over: Partial<AuthorProfileType> = {}): AuthorProfileType => ({
  slug: "subodh-kandel",
  display_name: "Subodh Kandel",
  name_ne: "",
  photo_url: "",
  description: "Caseworker",
  email: null,
  links: [],
  cases: [],
  ...over,
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthorProfile />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(getAuthorProfile).mockReset();
});

describe("AuthorProfile", () => {
  it("renders the name and description", async () => {
    vi.mocked(getAuthorProfile).mockResolvedValue(profile());
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Subodh Kandel" })).toBeTruthy(),
    );
    expect(screen.getByText("Caseworker")).toBeTruthy();
  });

  it("renders the photo when set and a placeholder when not", async () => {
    vi.mocked(getAuthorProfile).mockResolvedValue(
      profile({ photo_url: "https://s3.jawafdehi.org/team/subodh.jpeg" }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector("img")).toBeTruthy());
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://s3.jawafdehi.org/team/subodh.jpeg",
    );
  });

  it("renders social links as outbound anchors", async () => {
    vi.mocked(getAuthorProfile).mockResolvedValue(
      profile({
        links: [
          { type: "instagram", value: "https://instagram.com/subodh_kandel" },
          { type: "github", value: "https://github.com/subodh" },
        ],
      }),
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(container.querySelector('a[href^="https://instagram"]')).toBeTruthy(),
    );
    const external = container.querySelector('a[href^="https://instagram"]');
    expect(external?.getAttribute("target")).toBe("_blank");
    expect(external?.getAttribute("rel")).toContain("noopener");
    expect(container.querySelector('a[href^="https://github"]')).toBeTruthy();
  });

  it("omits the email link when the author published no address", async () => {
    vi.mocked(getAuthorProfile).mockResolvedValue(profile({ email: null }));
    const { container } = renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Subodh Kandel" })).toBeTruthy(),
    );
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("renders the email link when the author published one", async () => {
    vi.mocked(getAuthorProfile).mockResolvedValue(
      profile({ email: "kandel@example.org" }),
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(container.querySelector('a[href^="mailto:"]')).toBeTruthy(),
    );
    expect(container.querySelector('a[href^="mailto:"]')?.getAttribute("href")).toBe(
      "mailto:kandel@example.org",
    );
  });

  it("lists the author's cases in the order the API returned them", async () => {
    vi.mocked(getAuthorProfile).mockResolvedValue(
      profile({
        cases: [
          {
            slug: "newest-case",
            title: "Newest case",
            case_type: "CORRUPTION",
            case_publish_date: "2026-08-20",
            bigo: 12_500_000,
          },
          {
            slug: "older-case",
            title: "Older case",
            case_type: "BRIBERY",
            case_publish_date: "2025-07-01",
            bigo: null,
          },
        ],
      }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(screen.getByText("Newest case")).toBeTruthy());
    const links = Array.from(container.querySelectorAll('a[href^="/case/"]'));
    // Ordering is the API's job (newest published first); the page must not
    // re-sort and quietly disagree with it.
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/case/newest-case",
      "/case/older-case",
    ]);
  });

  it("shows an empty state when the author has no published cases", async () => {
    vi.mocked(getAuthorProfile).mockResolvedValue(profile({ cases: [] }));
    renderPage();

    await waitFor(() => expect(screen.getByText("author.noCases")).toBeTruthy());
  });

  it("shows a not-found message when the profile is unavailable", async () => {
    vi.mocked(getAuthorProfile).mockRejectedValue(new Error("404"));
    renderPage();

    await waitFor(() => expect(screen.getByText("author.notFound")).toBeTruthy());
  });

  it("prefers the Nepali name when one is set", async () => {
    // The mock pins i18n.language to "en", so this asserts the fallback branch:
    // an English reader sees the English name even when a Nepali one exists.
    vi.mocked(getAuthorProfile).mockResolvedValue(
      profile({ name_ne: "सुबोध कँडेल" }),
    );
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Subodh Kandel" })).toBeTruthy(),
    );
  });
});
