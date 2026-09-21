import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Material } from "@/services/datalake-api";

const getMaterial = vi.fn();
vi.mock("@/services/datalake-api", () => ({
  getMaterial: (...args: unknown[]) => getMaterial(...args),
}));

// Isolate MaterialProfile's own rendering from the shared dialog/button widgets.
vi.mock("@/components/ViewJsonButton", () => ({ ViewJsonButton: () => null }));
vi.mock("@/components/DocumentPreviewDialog", () => ({ DocumentPreviewDialog: () => null }));

import MaterialProfile from "@/pages/MaterialProfile";

// A real AG source URL: one long, unbroken, percent-encoded string — the shape
// that overflows its grid cell and overlaps the neighbouring field.
const LONG_URL =
  "https://ag.gov.np/storage/abhiyogPatra/" +
  "%E0%A5%A6%E0%A5%AE%E0%A5%A8-FT-%E0%A5%A6%E0%A5%AA%E0%A5%AB%E0%A5%AF_1782114350.pdf";

const material = (extra: Record<string, unknown>): Material =>
  ({
    "@id": "https://jawafdehi.org/material/ag/116707",
    "@type": "CreativeWork",
    name: { en: "Abhiyog patra", ne: "" },
    ...extra,
  }) as Material;

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/material/ag/116707"]}>
          <Routes>
            <Route path="/material/*" element={<MaterialProfile />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

beforeEach(() => getMaterial.mockReset());

describe("MaterialProfile — overflow-safe rendering", () => {
  it("renders a long source URL as a compact host link, not raw percent-encoded text", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:sourceUrl": LONG_URL }));
    renderPage();

    const link = await screen.findByRole("link", { name: /ag\.gov\.np/i });
    expect(link.getAttribute("href")).toBe(LONG_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel") || "").toContain("noopener");
    expect(screen.queryByText(/%E0%A5/)).toBeNull();
  });

  it("wraps the document-text transcript so long unbroken runs stay inside the card on mobile", async () => {
    // Nepali transcripts carry dotted leaders (……………फरार) and long unbroken runs
    // that whitespace-pre-wrap alone will not break, overflowing the card on a
    // narrow (mobile) viewport. The paragraph must allow breaking inside a run.
    const longRun = "…".repeat(150) + "फरार";
    getMaterial.mockResolvedValue(material({ text: { ne: `TRANSCRIPT_MARKER ${longRun}` } }));
    renderPage();

    // Radix activates a tab on mousedown/focus, not on a synthetic click.
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "Document text" }));
    const para = await screen.findByText(/TRANSCRIPT_MARKER/);
    expect(para.className).toMatch(/\bwhitespace-pre-wrap\b/); // keep formatting
    expect(para.className).toMatch(/\bbreak-words\b/); // but break over-long runs
  });

  it("leaves a non-URL detail field as plain text", async () => {
    getMaterial.mockResolvedValue(material({ "jawafdehi:recordId": "116707" }));
    renderPage();
    expect(await screen.findByText("116707")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /116707/ })).toBeNull();
  });
});
