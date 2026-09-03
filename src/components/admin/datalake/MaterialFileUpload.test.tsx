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
      data-testid="role-select"
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

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toast(...a) }));

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }));
vi.mock("@/services/admin-api", () => ({
  uploadMaterialFile: uploadMock,
  adminErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import MaterialFileUpload from "./MaterialFileUpload";

function renderControl(
  props: Partial<React.ComponentProps<typeof MaterialFileUpload>> = {},
) {
  const onStagedChange = vi.fn();
  const onUploaded = vi.fn();
  const onUploadingChange = vi.fn();
  const utils = render(
    <MaterialFileUpload
      source="ciaa"
      ident="press-2081-042"
      onStagedChange={onStagedChange}
      onUploaded={onUploaded}
      onUploadingChange={onUploadingChange}
      {...props}
    />,
  );
  const input = utils.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  return { ...utils, input, onStagedChange, onUploaded, onUploadingChange };
}

const fileOf = (name: string, size = 64) =>
  new File(["x".repeat(size)], name, { type: "application/pdf" });

const pick = (input: HTMLInputElement, file: File) => {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
};

beforeEach(() => {
  toast.mockClear();
  uploadMock.mockReset();
});

describe("MaterialFileUpload — immediate mode (edit page)", () => {
  it("uploads the picked file to the material's source/ident and reports the result", async () => {
    const stored = { "@id": "https://jawafdehi.org/material/ciaa/press-2081-042" };
    uploadMock.mockResolvedValue(stored);

    const { input, onUploaded } = renderControl();
    const file = fileOf("order.pdf");
    pick(input, file);
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith("ciaa", "press-2081-042", file, "RAW"),
    );
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(stored));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "File uploaded" }),
    );
  });

  it("sends the chosen link role", async () => {
    uploadMock.mockResolvedValue({});
    const { input } = renderControl();
    pick(input, fileOf("scan.pdf"));
    fireEvent.change(screen.getByTestId("role-select"), {
      target: { value: "PERMALINK" },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith(
        "ciaa",
        "press-2081-042",
        expect.any(File),
        "PERMALINK",
      ),
    );
  });

  it("reports in-flight state so the parent form can block Save", async () => {
    // The upload response is the only thing that carries the new MediaObject
    // into form state, so a Save during the gap would write a doc without it.
    let resolveUpload: (v: unknown) => void = () => {};
    uploadMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    const { input, onUploadingChange } = renderControl();
    pick(input, fileOf("slow.pdf"));
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(true));
    resolveUpload({});
    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(false));
  });

  it("surfaces an upload failure without clearing the picked file", async () => {
    uploadMock.mockRejectedValue(new Error("boom"));
    const { input, onUploaded } = renderControl();
    pick(input, fileOf("order.pdf"));
    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

    await waitFor(() => expect(screen.getByText("Upload failed")).toBeTruthy());
    expect(onUploaded).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("MaterialFileUpload — deferred mode (create page)", () => {
  it("stages the file instead of uploading it, and offers no upload button", () => {
    // On /new there is no material yet, so there is nothing to attach to: the
    // form uploads after it creates one. A button here would imply otherwise.
    const { input, onStagedChange } = renderControl({ mode: "deferred" });
    const file = fileOf("charge-sheet.pdf");
    pick(input, file);

    expect(uploadMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /upload file/i })).toBeNull();
    expect(onStagedChange).toHaveBeenCalledWith({ file, role: "RAW" });
    expect(screen.getByText(/will be attached on save/i)).toBeTruthy();
  });

  it("re-stages with the new role when the role changes after picking", () => {
    // Otherwise the form would upload with a role the caseworker had changed.
    const { input, onStagedChange } = renderControl({ mode: "deferred" });
    const file = fileOf("alt.pdf");
    pick(input, file);
    onStagedChange.mockClear();

    fireEvent.change(screen.getByTestId("role-select"), {
      target: { value: "ALTERNATE" },
    });

    expect(onStagedChange).toHaveBeenCalledWith({ file, role: "ALTERNATE" });
  });

  it("clears the staged file when the picker is emptied", () => {
    const { input, onStagedChange } = renderControl({ mode: "deferred" });
    pick(input, fileOf("a.pdf"));
    onStagedChange.mockClear();

    Object.defineProperty(input, "files", { value: [], configurable: true });
    fireEvent.change(input);

    expect(onStagedChange).toHaveBeenCalledWith(null);
  });

  it("rejects an oversize file at pick time and stages nothing", () => {
    // Staging a file the server will 413 would fail the whole Save rather than
    // just the attachment, and deferred mode has no button to hang it off.
    const { input, onStagedChange } = renderControl({ mode: "deferred" });
    const huge = fileOf("huge.pdf", 0);
    Object.defineProperty(huge, "size", { value: 101 * 1024 * 1024 });
    pick(input, huge);

    expect(screen.getByText("File exceeds the 100MB limit.")).toBeTruthy();
    expect(onStagedChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ file: huge }),
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
