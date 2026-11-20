// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import { WHATS_NEW, whatsNewPostPath } from "@/data/whats-new";
import WhatsNewPost from "@/pages/WhatsNewPost";

// A changelog entry as its own post on Updates & News.
const renderAt = (url: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/updates/product/:id" element={<WhatsNewPost />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("WhatsNewPost", () => {
  it("renders the entry as a post: its title as the h1, and its link as the way on", () => {
    const entry = WHATS_NEW.find((e) => e.href) ?? WHATS_NEW[0];
    renderAt(whatsNewPostPath(entry.id));
    expect([entry.title.en, entry.title.ne]).toContain(screen.getByRole("heading", { level: 1 }).textContent);
    if (entry.href) {
      const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
      expect(hrefs).toContain(entry.href);
    }
  });

  it("offers the other entries underneath, never itself", () => {
    const entry = WHATS_NEW[0];
    renderAt(whatsNewPostPath(entry.id));
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain(whatsNewPostPath(entry.id));
    expect(hrefs.filter((h) => h?.startsWith("/updates/product/")).length).toBe(Math.min(3, WHATS_NEW.length - 1));
  });

  it("is a 404 for an unknown entry", () => {
    renderAt("/updates/product/no-such-entry");
    // The site's NotFound page, not an empty post.
    expect(document.body.textContent).toMatch(/isn't in the archive|अभिलेखमा छैन/);
  });
});
