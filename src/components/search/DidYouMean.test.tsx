import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Passthrough translations so assertions don't depend on i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

import { DidYouMean } from "@/components/search/DidYouMean";

describe("DidYouMean", () => {
  it("offers the suggested spelling", () => {
    render(<DidYouMean onAccept={vi.fn()} suggestion="corruption" />);
    expect(screen.getByText("Did you mean", { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: "corruption" })).toBeTruthy();
  });

  it("hands the suggestion back only when the reader accepts it", () => {
    const onAccept = vi.fn();
    render(<DidYouMean onAccept={onAccept} suggestion="corruption" />);
    // Nothing happens on render — the correction is an offer, never automatic.
    // Silently rewriting a search for a person's name in an accountability
    // archive would surface records about someone the reader never asked about.
    expect(onAccept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "corruption" }));
    expect(onAccept).toHaveBeenCalledExactlyOnceWith("corruption");
  });

  it("is a button, not a link", () => {
    // Accepting edits the query already on screen rather than navigating to a new
    // destination, so it must not be announced as a link to a screen reader.
    render(<DidYouMean onAccept={vi.fn()} suggestion="melamci" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "melamci" }).getAttribute("type")).toBe(
      "button",
    );
  });
});
