import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: "en" },
  }),
}));

import { CaseReportForm } from "@/components/CaseReportForm";

// Radix's Checkbox measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

describe("CaseReportForm anonymous notice", () => {
  it("tells an anonymous reporter we can't reply, only once they choose anonymous", () => {
    render(<CaseReportForm />);
    expect(screen.queryByTestId("anonymous-no-reply-notice")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "report.submitAnonymously" }));

    const notice = screen.getByTestId("anonymous-no-reply-notice");
    expect(notice.textContent).toBe("report.anonymousNoReply");
  });

  it("has the notice text in both English and Nepali", () => {
    expect(en.report.anonymousNoReply).toMatch(/can't reply/);
    expect(ne.report.anonymousNoReply).toMatch(/जवाफ दिन/);
  });
});
