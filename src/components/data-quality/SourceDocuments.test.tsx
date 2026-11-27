import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { stats } from "@/lib/source-documents.fixtures";

const getSourceDocumentStats = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en" },
    t: (key: string, values?: Record<string, unknown>) =>
      values && typeof values === "object" ? `${key} ${JSON.stringify(values)}` : key,
  }),
}));
vi.mock("@/services/jds-api", () => ({ getSourceDocumentStats: () => getSourceDocumentStats() }));

import { SourceDocuments } from "@/components/data-quality/SourceDocuments";

function renderSection() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SourceDocuments />
    </QueryClientProvider>,
  );
}

describe("SourceDocuments", () => {
  it("renders nothing when the API has no snapshot (older API, 503, bad shape)", async () => {
    getSourceDocumentStats.mockResolvedValue(null);
    const { container } = renderSection();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.innerHTML).toBe("");
  });

  it("opens on published-case sources: the as-of date, every file state and the withheld reasons", async () => {
    getSourceDocumentStats.mockResolvedValue(stats());
    renderSection();

    expect(await screen.findByRole("heading", { name: "dataQuality.sourceDocs.heading" })).toBeTruthy();
    expect(screen.getByText(/dataQuality.sourceDocs.asOf/).textContent).toContain("27 November 2026");

    const published = screen.getByRole("button", { name: /scope.published_cases/ });
    expect(published.getAttribute("aria-pressed")).toBe("true");
    expect(published.textContent).toContain("(5,570)");
    expect(screen.getByText(/scope.publishedNote/).textContent).toContain('"cases":"2,790"');

    // All five public-file states, each with its count and share, in order.
    const states = screen
      .getAllByText(/^dataQuality\.sourceDocs\.pdf\./)
      .map((el) => el.textContent?.replace("dataQuality.sourceDocs.pdf.", ""));
    expect(states).toEqual(["redacted", "withheld", "not_yet_redacted", "publisher_hosted", "no_file"]);
    const notYet = screen.getByText("dataQuality.sourceDocs.pdf.not_yet_redacted").closest("li")!;
    expect(notYet.textContent).toContain("3,003");
    expect(notYet.textContent).toContain("53.9%");
    // 3 of 5,570 is not "0%".
    expect(screen.getByText("dataQuality.sourceDocs.pdf.no_file").closest("li")!.textContent).toContain("<0.1%");

    // Non-zero sub-breakdowns only: no "oversized" row when none are.
    expect(screen.getByText("dataQuality.sourceDocs.withheldReason.needs_hand_redaction")).toBeTruthy();
    expect(screen.queryByText("dataQuality.sourceDocs.withheldReason.oversized")).toBeNull();
    expect(screen.getByText("dataQuality.sourceDocs.redactedBy.staff_hand_redacted")).toBeTruthy();

    // The stacked bar names every segment for screen readers.
    expect(screen.getAllByRole("img")[0].getAttribute("aria-label")).toContain(
      "dataQuality.sourceDocs.pdf.withheld 145",
    );
  });

  it("switches to the whole archive, with readable-text kinds and the four key groups", async () => {
    getSourceDocumentStats.mockResolvedValue(stats());
    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: /scope.archive/ }));
    expect(screen.getByRole("button", { name: /scope.archive/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText(/scope.publishedNote/)).toBeNull();

    expect(screen.getByText(/text.summary/).textContent).toContain('"part":"92,669"');
    // Kinds with documents are listed; a zero kind ("other") is not.
    expect(screen.getByText("dataQuality.sourceDocs.kind.pdf_ocr")).toBeTruthy();
    expect(screen.queryByText("dataQuality.sourceDocs.kind.other")).toBeNull();

    const table = screen.getByRole("table");
    const chargeSheets = within(table).getByRole("row", { name: /group.charge_sheet/ });
    expect(chargeSheets.textContent).toContain("99,708");
    expect(chargeSheets.textContent).toContain("23.5%");
    expect(chargeSheets.textContent).toContain("98,213");
    expect(within(table).getAllByRole("row")).toHaveLength(5); // header + 4 groups
  });

  it("never shows a non-empty readable-text share as 0%", async () => {
    const tiny = stats();
    tiny.scopes.published_cases = {
      ...tiny.scopes.published_cases,
      total: 100_000,
      text: { ...tiny.scopes.published_cases.text, with_text: 5, without_text: 99_995 },
      by_group: [{ group: "charge_sheet", total: 100_000, with_text: 5, redacted_pdf: 0, withheld: 0 }],
    };
    getSourceDocumentStats.mockResolvedValue(tiny);
    renderSection();
    const summary = await screen.findByText(/text.summary/);
    const panel = summary.parentElement!;
    expect(panel.textContent).toContain("<0.1%");
    expect(panel.textContent).not.toMatch(/(^|[^.\d<])0%/);
    const row = within(screen.getByRole("table")).getByRole("row", { name: /group.charge_sheet/ });
    expect(row.textContent).toContain("<0.1%");
  });

  it("explains what redacted, withheld and readable text mean, and why", async () => {
    getSourceDocumentStats.mockResolvedValue(stats());
    renderSection();
    expect(await screen.findByText("dataQuality.sourceDocs.explain.withheld.term")).toBeTruthy();
    expect(screen.getByText("dataQuality.sourceDocs.explain.redacted.body")).toBeTruthy();
    expect(screen.getByText("dataQuality.sourceDocs.explain.why")).toBeTruthy();
  });
});
