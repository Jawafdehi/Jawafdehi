import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Radix Select relies on pointer/layout APIs jsdom lacks; swap it for a native
// <select> so onValueChange can be driven deterministically with fireEvent.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
    children?: ReactNode;
  }) => (
    <select
      data-testid="policy-select"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onValueChange(e.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

// The toast hook is a side-effect; stub it so we can assert it fired.
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toast(...a) }));

// Isolate the network call. adminErrorMessage just relays the fallback here.
const { patchMock } = vi.hoisted(() => ({ patchMock: vi.fn() }));
vi.mock("@/services/admin-api", () => ({
  patchMaterialVisibilityPolicy: patchMock,
  adminErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import MaterialVisibilityControl from "./MaterialVisibilityControl";

const IRI = "https://jawafdehi.org/material/ciaa/press-2081-042";

beforeEach(() => {
  toast.mockClear();
  patchMock.mockReset();
});

describe("MaterialVisibilityControl", () => {
  it("shows the current policy and its derived visibility", () => {
    render(<MaterialVisibilityControl iri={IRI} policy="PUBLIC" visibility="LISTED" />);
    expect(screen.getByText("LISTED")).toBeTruthy();
    expect((screen.getByTestId("policy-select") as HTMLSelectElement).value).toBe(
      "PUBLIC",
    );
  });

  it("PATCHes the chosen policy and reflects the server-recomputed visibility", async () => {
    // A public doc marked PRIVATE resolves to PRIVATE visibility on the server.
    patchMock.mockResolvedValue({
      "jawafdehi:visibilityPolicy": "PRIVATE",
      "jawafdehi:visibility": "PRIVATE",
    });
    render(<MaterialVisibilityControl iri={IRI} policy="PUBLIC" visibility="LISTED" />);

    fireEvent.change(screen.getByTestId("policy-select"), {
      target: { value: "PRIVATE" },
    });

    await waitFor(() => expect(patchMock).toHaveBeenCalledWith(IRI, "PRIVATE"));
    // The badge follows the server's recomputed visibility, not the raw policy.
    await waitFor(() => expect(screen.getByText("PRIVATE")).toBeTruthy());
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Visibility updated" }),
    );
  });

  it("reverts the selection and surfaces an error when the PATCH fails", async () => {
    patchMock.mockRejectedValue(new Error("boom"));
    render(<MaterialVisibilityControl iri={IRI} policy="PUBLIC" visibility="LISTED" />);

    fireEvent.change(screen.getByTestId("policy-select"), {
      target: { value: "CASE_GATED" },
    });

    await waitFor(() =>
      expect(screen.getByText("Failed to update visibility")).toBeTruthy(),
    );
    // Reverted to the original policy; the derived-visibility badge never moved.
    expect((screen.getByTestId("policy-select") as HTMLSelectElement).value).toBe(
      "PUBLIC",
    );
    expect(screen.getByText("LISTED")).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });
});
