import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import CaseImageField from "@/components/admin/case/CaseImageField";
import type { CaseImage } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const uploadCaseImage = vi.fn();
vi.mock("@/services/admin-api", () => ({
  uploadCaseImage: (...args: unknown[]) => uploadCaseImage(...args),
  adminErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

const LADDER: CaseImage = {
  src: "https://s3.example.org/a.width-1200.format-webp.webp",
  srcset: "https://s3.example.org/a.width-400.format-webp.webp 400w",
  width: 1200,
  height: 675,
  alt: "",
};

function renderField(props: Partial<React.ComponentProps<typeof CaseImageField>> = {}) {
  const onChange = vi.fn();
  const onUploadingChange = vi.fn();
  const utils = render(
    <CaseImageField
      variant="card"
      label="Card image"
      help="Shown on the home page."
      imageId={null}
      preview={null}
      onChange={onChange}
      onUploadingChange={onUploadingChange}
      testId="field"
      {...props}
    />,
  );
  const input = utils.container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  return { ...utils, input, onChange, onUploadingChange };
}

const pick = (input: HTMLInputElement, name = "photo.png") => {
  const file = new File(["x".repeat(64)], name, { type: "image/png" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
};

beforeEach(() => {
  uploadCaseImage.mockReset();
});

describe("CaseImageField upload pending state", () => {
  it("reports pending before the upload resolves, and clears it after", async () => {
    // The whole point: onChange only fires on RESOLVE, so the parent form has
    // no other way to know an upload is in flight. Without this signal the form
    // is submittable in the gap, and the image id never reaches the case.
    let resolveUpload: (v: unknown) => void = () => {};
    uploadCaseImage.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    const { input, onUploadingChange, onChange } = renderField();
    pick(input);

    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(true));
    expect(onChange).not.toHaveBeenCalled();

    resolveUpload({ id: 9, title: "photo.png", width: 1200, height: 675, thumbnail: LADDER, banner: LADDER });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(9, LADDER));
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
  });

  it("clears the pending flag when the upload FAILS", async () => {
    // Otherwise a failed upload would wedge the form's save button forever.
    uploadCaseImage.mockRejectedValue(new Error("boom"));

    const { input, onUploadingChange, onChange } = renderField();
    pick(input);

    await waitFor(() => expect(onUploadingChange).toHaveBeenLastCalledWith(false));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not report pending for a file over the size cap", async () => {
    // Rejected before any request, so there is nothing for the form to wait on.
    const { input, onUploadingChange } = renderField();
    const huge = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(huge, "size", { value: 11 * 1024 * 1024 });
    Object.defineProperty(input, "files", { value: [huge], configurable: true });
    fireEvent.change(input);

    expect(uploadCaseImage).not.toHaveBeenCalled();
    expect(onUploadingChange).not.toHaveBeenCalledWith(true);
  });

  it("disables both controls while the form is saving", () => {
    renderField({ imageId: 4, preview: LADDER, disabled: true });

    // Plain DOM property: this suite has no jest-dom matchers registered.
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
    expect(buttons.length).toBeGreaterThan(1); // Replace + Remove
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });
});
