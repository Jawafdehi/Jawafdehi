// SPDX-License-Identifier: Hippocratic-3.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ne", changeLanguage: vi.fn() },
  }),
}));
vi.mock("@/components/Seo", () => ({ Seo: () => null }));

import Privacy from "@/pages/Privacy";

// On the client the legal texts are lazy chunks (src/pages/legal/bodies.ts), so
// they stay out of every visitor's initial JS. Nothing registers the eager
// versions in this file, as in the browser.

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the legal texts load lazily on the client", () => {
  // First: once a lazy() chunk has resolved it renders synchronously.
  it("keeps showing the pre-rendered body while the chunk loads, so the page never flashes empty", () => {
    const server = document.createElement("div");
    server.innerHTML =
      '<div data-legal-body="privacy" lang="ne"><h2 id="overview">PRE-RENDERED</h2></div>';
    document.body.appendChild(server);

    const { container } = render(<Privacy />);
    // First client render, before the lazy chunk has resolved.
    expect(container.querySelector('[data-legal-body="privacy"]')?.textContent).toContain(
      "PRE-RENDERED",
    );
  });

  it("renders the body once its chunk arrives", async () => {
    render(<Privacy />);
    expect(await screen.findByRole("heading", { name: "१. परिचय" })).toBeTruthy();
  });
});
