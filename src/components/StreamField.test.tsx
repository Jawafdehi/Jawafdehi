import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { StreamField } from "@/components/StreamField";
import type { StreamBlock } from "@/types/cms";

// Passthrough translations so assertions don't depend on i18n resources. The
// object is built once so `t` keeps a stable identity across renders, the way
// the real react-i18next does.
vi.mock("react-i18next", () => {
  const translation = {
    t: (key: string, fallback?: string) => fallback ?? key,
  };
  return { useTranslation: () => translation };
});

// The preview viewer measures its container to size PDF pages; jsdom has no
// ResizeObserver, so give it an inert one.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const documentBlock = (filename: string, url: string): StreamBlock => ({
  type: "document",
  id: "doc-1",
  value: { id: 1, title: "Vacancy announcement", url, filename },
});

const renderBlocks = (blocks: StreamBlock[]) =>
  render(
    <MemoryRouter>
      <StreamField blocks={blocks} />
    </MemoryRouter>,
  );

describe("StreamField document blocks", () => {
  it("offers a preview for a PDF rather than downloading on click", () => {
    renderBlocks([documentBlock("report.pdf", "https://portal.jawafdehi.org/documents/1/report.pdf")]);

    const trigger = screen.getByRole("button", { name: /Vacancy announcement/ });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.textContent).toContain("Preview");
    // No straight-to-file anchor is rendered for a previewable document.
    expect(screen.queryByRole("link", { name: /Vacancy announcement/ })).toBeNull();
  });

  it("opens the shared preview dialog when the card is activated", async () => {
    renderBlocks([documentBlock("report.pdf", "https://portal.jawafdehi.org/documents/1/report.pdf")]);

    // Closed until asked for — the dialog isn't mounted on render.
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Vacancy announcement/ }));

    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("treats markdown transcripts as previewable too", () => {
    renderBlocks([documentBlock("transcript.md", "https://portal.jawafdehi.org/documents/2/transcript.md")]);

    expect(screen.getByRole("button", { name: /Vacancy announcement/ })).toBeTruthy();
  });

  it("keeps the direct download for formats with no viewer", () => {
    renderBlocks([documentBlock("form.docx", "https://portal.jawafdehi.org/documents/3/form.docx")]);

    const link = screen.getByRole("link", { name: /Vacancy announcement/ });
    expect(link.getAttribute("href")).toBe(
      "https://portal.jawafdehi.org/documents/3/form.docx",
    );
    expect(link.textContent).toContain("Download");
    expect(screen.queryByRole("button", { name: /Vacancy announcement/ })).toBeNull();
  });

  it("falls back to the URL when the filename carries no extension", () => {
    renderBlocks([documentBlock("", "https://portal.jawafdehi.org/documents/4/paper.pdf?v=2")]);

    // Query strings must not defeat the extension check.
    expect(screen.getByRole("button", { name: /Vacancy announcement/ })).toBeTruthy();
  });
});
