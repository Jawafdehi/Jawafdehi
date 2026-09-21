// SPDX-License-Identifier: Hippocratic-3.0
//
// Public smoke: the homepage hero search drives a REAL archive search.
// home → type in the hero combobox → Enter → /search?type=case&q=… renders
// results from the backend (no mocks). Runs in the `public` project.
import { test, expect, type Page } from "@playwright/test";

// Pre-answer the two entry surfaces that can steal focus or intercept input on
// the homepage: the cookie-consent bar and the newsletter entry modal
// (jawafdehi_newsletter_prompt honours a stored dismissal — see
// src/lib/newsletter.ts).
async function suppressEntryPrompts(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("jawafdehi_analytics_consent", "denied");
    localStorage.setItem(
      "jawafdehi_newsletter_prompt",
      JSON.stringify({ state: "dismissed", ts: Date.now() }),
    );
  });
}

test.beforeEach(async ({ page }) => {
  await suppressEntryPrompts(page);
});

test("hero search submits to /search and renders results", async ({ page }) => {
  await page.goto("/");

  // The hero search is a WAI-ARIA combobox (typeahead); type like a user so
  // the debounce path is exercised too.
  const searchBox = page.getByRole("combobox").first();
  await expect(searchBox).toBeVisible();
  await searchBox.click();
  await searchBox.pressSequentially("corruption", { delay: 40 });

  // Enter with no suggestion selected submits the full archive search —
  // the pre-typeahead contract (/search?type=case&q=…) must survive.
  await searchBox.press("Enter");
  await expect(page).toHaveURL(/\/search\?type=case&q=corruption/);

  // The search page rendered against the real backend: content mounted and no
  // hard-fail surface.
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.locator("h1, h2").first()).toBeVisible();
  await expect(page.getByText(/503|search is unavailable/i)).toHaveCount(0);

  // "Shows results": the seeded archive must surface at least one case link.
  await expect(page.locator('a[href^="/case/"]').first()).toBeVisible();
});
