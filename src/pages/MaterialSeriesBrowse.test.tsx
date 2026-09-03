import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Material } from "@/services/datalake-api";

const listMaterialsBySource = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      "materialsLanding.filters.presets.all": "All time",
      "materialsLanding.filters.presets.30-days": "Last 30 days",
      "materialsLanding.filters.presets.6-months": "Last 6 months",
      "materialsLanding.filters.presets.1-year": "Last year",
      "materialsLanding.filters.clear": "Clear filters",
    };
    return {
      i18n: { language: "en" },
      t: (
        key: string,
        fallbackOrOptions?: string | Record<string, unknown>,
        interpolation?: Record<string, unknown>,
      ) => {
        const fallback =
          translations[key] ??
          (typeof fallbackOrOptions === "string" ? fallbackOrOptions : key);
        const values =
          (typeof fallbackOrOptions === "object"
            ? fallbackOrOptions
            : interpolation) ?? {};
        return fallback.replace(/{{(\w+)}}/g, (_, name: string) =>
          String(values[name] ?? ""),
        );
      },
    };
  },
}));

vi.mock("@/components/Seo", () => ({ default: () => null }));
vi.mock("@/components/ShareButton", () => ({ ShareButton: () => null }));
vi.mock("@/services/datalake-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/datalake-api")>();
  return {
    ...actual,
    listMaterialsBySource: (...args: unknown[]) =>
      listMaterialsBySource(...args),
  };
});

import MaterialSeriesBrowse from "@/pages/MaterialSeriesBrowse";

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function material(id: string, title: string, datePublished: string): Material {
  return {
    "@id": `https://jawafdehi.org/material/ag/${id}`,
    name: { en: title },
    datePublished,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MaterialSeriesBrowse slug="charge-sheets" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  listMaterialsBySource.mockReset();
});

describe("MaterialSeriesBrowse filters", () => {
  it("filters loaded documents by search, preset, custom range, and clear", async () => {
    const today = new Date();
    const recentDate = localIsoDate(today);
    const priorDate = new Date(today);
    priorDate.setDate(priorDate.getDate() - 10);
    const tenDaysAgo = localIsoDate(priorDate);
    const oldDate = "2020-01-15";

    listMaterialsBySource.mockResolvedValue({
      next: null,
      previous: null,
      results: [
        material("recent", "Recent budget charge", recentDate),
        material("prior", "Prior procurement charge", tenDaysAgo),
        material("old", "Historic land charge", oldDate),
      ],
    });

    renderPage();

    expect(await screen.findByText("Showing 3 of 3 loaded")).toBeTruthy();

    fireEvent.change(
      screen.getByPlaceholderText("Search inside this series…"),
      { target: { value: "budget" } },
    );
    await waitFor(() =>
      expect(screen.getByText("Showing 1 of 3 loaded")).toBeTruthy(),
    );
    expect(screen.queryByText("Historic land charge")).toBeNull();

    fireEvent.change(
      screen.getByPlaceholderText("Search inside this series…"),
      { target: { value: "" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    await waitFor(() =>
      expect(screen.getByText("Showing 2 of 3 loaded")).toBeTruthy(),
    );
    expect(screen.queryByText("Historic land charge")).toBeNull();

    fireEvent.change(screen.getByLabelText("From date (AD)"), {
      target: { value: recentDate },
    });
    fireEvent.change(screen.getByLabelText("To date (AD)"), {
      target: { value: recentDate },
    });
    await waitFor(() =>
      expect(screen.getByText("Showing 1 of 3 loaded")).toBeTruthy(),
    );
    expect(screen.getByText("Recent budget charge")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(screen.getByText("Showing 3 of 3 loaded")).toBeTruthy(),
    );
  });
});
