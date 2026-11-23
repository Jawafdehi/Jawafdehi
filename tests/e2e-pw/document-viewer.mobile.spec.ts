// SPDX-License-Identifier: Hippocratic-3.0
//
// Phone gate for a material page and its PDF viewer. Runs under the four
// `mobile-*` projects (320/360/390/640 wide), like responsive.mobile.spec.ts.
//
// Measured on production, 2026-11-23, at 390px:
//   * the material page overflowed by 30px: its description ends in
//     "Original page: https://…", one unbreakable token, and the paragraph had
//     no break-words;
//   * the open viewer was 691px wide: the dialog panel is a CSS grid and the
//     viewer, a grid item, kept the default `min-width: auto`, so the header
//     row's content set its width. The title never truncated and the download
//     button sat off-screen.
//
// The phone-gates job serves the client build with no reachable API, so the
// material and the document proxy are answered here. Every other API call gets
// a 404, so the test never touches production.
import { test, expect, type Page } from "@playwright/test";

const TAIL = "ppmo/13179";
const PDF_URL = "https://s3.jawafdehi.org/case_uploads/04d8d38d55836447.pdf";

const MATERIAL = {
  "@context": "https://schema.org",
  "@type": "Report",
  "@id": `https://jawafdehi.org/material/${TAIL}`,
  name: {
    en: "Qualification Standards for Staff Doing Procurement Work in Public Entities, 2078",
  },
  description: {
    en:
      "Directive, standard, notice or other document published by the Public Procurement " +
      "Monitoring Office. Original page: https://www.ppmo.gov.np/content/13179/%E0%A4%B8%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%B5%E0%A4%9C%E0%A4%A8%E0%A4%BF%E0%A4%95/",
  },
  identifier: "13179",
  url: "https://www.ppmo.gov.np/content/13179/",
  datePublished: "2021-10-01",
  associatedMedia: [
    {
      "@type": "MediaObject",
      contentUrl: PDF_URL,
      encodingFormat: "application/pdf",
      "jawafdehi:linkRole": "RAW",
    },
  ],
};

// A valid one-page PDF, small enough to inline.
const PDF = [
  "%PDF-1.4",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj",
  "trailer<</Root 1 0 R>>",
  "%%EOF",
].join("\n");

async function mockApi(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("jawafdehi_analytics_consent", "denied");
    } catch {
      /* private mode */
    }
  });
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.replace(/\/$/, "") === `/api/materials/${TAIL}`) {
      return route.fulfill({ status: 200, contentType: "application/ld+json", body: JSON.stringify(MATERIAL) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
  await page.route("**/document-preview?**", (route) =>
    route.fulfill({ status: 200, contentType: "application/pdf", body: PDF }),
  );
}

/** Horizontal overflow of the document, and anything poking past the viewport. */
async function overflow(page: Page, requested: number) {
  return page.evaluate((want) => {
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.right - want <= 1) continue;
      // Content inside a clipping/scrolling box (the PDF pages) is not overflow.
      let clipped = false;
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(n).overflowX)) {
          clipped = true;
          break;
        }
      }
      if (!clipped) offenders.push(`${el.tagName.toLowerCase()}.${(el.getAttribute("class") || "").slice(0, 60)}`);
      if (offenders.length >= 5) break;
    }
    return {
      over: Math.max(0, document.documentElement.scrollWidth - want),
      inner: window.innerWidth,
      offenders,
    };
  }, requested);
}

test.describe("material page and PDF viewer on a phone", () => {
  test.beforeEach(async ({ page }) => mockApi(page));

  test("the page does not overflow, and the open viewer fits the screen", async ({ page }, testInfo) => {
    const want = testInfo.project.use.viewport!.width;
    await page.goto(`/material/${TAIL}`, { waitUntil: "domcontentloaded" });
    const pdfButton = page.getByRole("button", { name: /^PDF$/ });
    await expect(pdfButton).toBeVisible({ timeout: 20_000 });

    const pageM = await overflow(page, want);
    expect(
      pageM.over,
      `material page overflows its ${want}px viewport by ${pageM.over}px ` +
        `(innerWidth ${pageM.inner}). Offenders: ${JSON.stringify(pageM.offenders)}`,
    ).toBe(0);

    await pdfButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("/ 1")).toBeVisible({ timeout: 20_000 });

    const box = await dialog.boundingBox();
    expect(box!.x + box!.width, `viewer is ${Math.round(box!.width)}px wide on a ${want}px screen`)
      .toBeLessThanOrEqual(want + 1);

    // The header's controls are on screen: close, title (truncated), download.
    for (const [what, locator] of [
      ["close button", dialog.getByRole("button").first()],
      ["title", dialog.getByText(MATERIAL.name.en).first()],
      ["download button", dialog.locator("a[download]")],
    ] as const) {
      const b = await locator.boundingBox();
      expect(b, `${what} not rendered`).not.toBeNull();
      expect(b!.x, `${what} starts off-screen`).toBeGreaterThanOrEqual(-1);
      expect(b!.x + b!.width, `${what} ends off-screen (${Math.round(b!.x + b!.width)}px)`)
        .toBeLessThanOrEqual(want + 1);
    }

    const dialogM = await overflow(page, want);
    expect(
      dialogM.over,
      `open viewer overflows the ${want}px viewport by ${dialogM.over}px. ` +
        `Offenders: ${JSON.stringify(dialogM.offenders)}`,
    ).toBe(0);
  });
});
