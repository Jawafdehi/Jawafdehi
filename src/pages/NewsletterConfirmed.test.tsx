import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import NewsletterConfirmed from "@/pages/NewsletterConfirmed";

// Passthrough i18n so the test doesn't depend on translation resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

describe("NewsletterConfirmed", () => {
  it("renders a confirmation heading and links back into the archive", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <NewsletterConfirmed />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "newsletter.confirmed.exploreCases" }).getAttribute("href"),
    ).toBe("/cases");
    expect(
      screen.getByRole("link", { name: "newsletter.confirmed.home" }).getAttribute("href"),
    ).toBe("/");
  });
});
