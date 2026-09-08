import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));

    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith("ciaa", "press-2081-042", file, "RAW"),
    );
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(stored));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "File uploaded" }),
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
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));

    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(true));
    resolveUpload({});
    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(false));
  });

  it("surfaces an upload failure without clearing the picked file", async () => {
    uploadMock.mockRejectedValue(new Error("boom"));
    const { input, onUploaded } = renderControl();
    pick(input, fileOf("order.pdf"));
    fireEvent.click(screen.getByRole("button", { name: /attach file/i }));

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
    expect(screen.queryByRole("button", { name: /attach file/i })).toBeNull();
    expect(onStagedChange).toHaveBeenCalledWith({ file });
    // The filename is NOT echoed here — the parent lists the staged file as a
    // pending row next to the links, which is where it actually lands.
    expect(screen.queryByText(/will be attached on save/i)).toBeNull();
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
    // Assert the POSITIVE clear, not just the absence of a staging call: the
    // weaker `not.toHaveBeenCalledWith(...)` also passes when the control never
    // calls back at all, which would leave a previously-staged file in place.
    expect(onStagedChange).toHaveBeenCalledWith(null);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("clears a previously staged file when the next pick is oversize", () => {
    const { input, onStagedChange, container } = renderControl({ mode: "deferred" });
    pick(input, fileOf("good.pdf"));
    expect(onStagedChange).toHaveBeenLastCalledWith({ file: expect.any(File) });

    const huge = fileOf("huge.pdf", 0);
    Object.defineProperty(huge, "size", { value: 101 * 1024 * 1024 });
    // The input is remounted on rejection, so pick against the current one.
    const live = container.querySelector<HTMLInputElement>('input[type="file"]');
    pick(live!, huge);

    expect(onStagedChange).toHaveBeenLastCalledWith(null);
  });
});

describe("MaterialFileUpload — oversize does not wedge the picker", () => {
  it("resets the input after rejecting, so the same file can be picked again", () => {
    // A file input emits no change event when its value is unchanged, so
    // leaving the rejected filename in place would make re-picking that exact
    // path a no-op and strand the control until a different file was chosen.
    const { input, container } = renderControl();
    const huge = fileOf("huge.pdf", 0);
    Object.defineProperty(huge, "size", { value: 101 * 1024 * 1024 });
    pick(input, huge);

    const live = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(live).not.toBe(input); // remounted
    expect(live!.value).toBe("");
    // And a valid pick on the fresh input still works.
    pick(live!, fileOf("ok.pdf"));
    expect(screen.queryByText("File exceeds the 100MB limit.")).toBeNull();
    expect(
      (screen.getByRole("button", { name: /attach file/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
