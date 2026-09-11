import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Radix Select needs pointer/layout APIs jsdom lacks; a native <select> makes
// onValueChange drivable with fireEvent.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange: (v: string) => void;
    children?: ReactNode;
  }) => (
    <select value={value ?? ""} onChange={(e) => onValueChange(e.currentTarget.value)}>
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

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

const { createEntity, uploadCaseImage } = vi.hoisted(() => ({
  createEntity: vi.fn(),
  uploadCaseImage: vi.fn(),
}));
vi.mock("@/services/admin-api", () => ({
  createEntity,
  uploadCaseImage,
  adminErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import EntityCreate from "./EntityCreate";

// Non-square, so a width/height transposition cannot pass.
const THUMB = {
  src: "https://s3.example.org/ram.width-1200.format-webp.webp",
  srcset: "",
  width: 1200,
  height: 675,
  alt: "",
};
const RESULT = { id: 3, title: "ram.png", width: 900, height: 900, thumbnail: THUMB, banner: THUMB };

function fillRequired(container: HTMLElement) {
  fireEvent.change(container.querySelector("#prefix")!, { target: { value: "person" } });
  fireEvent.change(container.querySelector("#name-en")!, { target: { value: "Ram Bahadur" } });
}

function pickPicture(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File(["x".repeat(64)], "ram.png", { type: "image/png" });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: /create entity/i }));
const saveBtn = () =>
  screen.getByRole("button", { name: /create entity/i }) as HTMLButtonElement;

beforeEach(() => {
  navigate.mockClear();
  createEntity.mockReset();
  uploadCaseImage.mockReset();
});

describe("EntityCreate — picture", () => {
  it("sends the uploaded picture inside the SINGLE create POST", async () => {
    // Unlike the material file flow there is no create-then-attach: the upload
    // has already happened by the time Save runs, so one write carries it and
    // "created but the picture didn't attach" is not a reachable state.
    uploadCaseImage.mockResolvedValue(RESULT);
    createEntity.mockResolvedValue({ "@id": "https://jawafdehi.org/entity/person/ram-bahadur" });

    const { container } = render(<EntityCreate />);
    fillRequired(container);
    pickPicture(container);
    await waitFor(() => expect(uploadCaseImage).toHaveBeenCalledTimes(1));

    submit();
    await waitFor(() => expect(createEntity).toHaveBeenCalledTimes(1));
    expect(createEntity.mock.calls[0][0]).toMatchObject({
      prefix: "person",
      slug: "ram-bahadur",
      image: { "@type": "ImageObject", contentUrl: THUMB.src, width: 1200, height: 675 },
    });
  });

  it("omits the image key entirely when no picture was chosen", async () => {
    createEntity.mockResolvedValue({ "@id": "x" });
    const { container } = render(<EntityCreate />);
    fillRequired(container);
    submit();

    await waitFor(() => expect(createEntity).toHaveBeenCalled());
    // Absent, not null/undefined-valued — the backend copies free-form props
    // verbatim, so a present-but-empty key would land in the stored document.
    expect("image" in createEntity.mock.calls[0][0]).toBe(false);
    expect(uploadCaseImage).not.toHaveBeenCalled();
  });

  it("blocks Create while the picture is still uploading", async () => {
    // The upload resolves into form state asynchronously; submitting in the gap
    // would create the entity with no picture and orphan the uploaded file.
    let resolveUpload: (v: unknown) => void = () => {};
    uploadCaseImage.mockReturnValue(new Promise((r) => (resolveUpload = r)));

    const { container } = render(<EntityCreate />);
    fillRequired(container);
    expect(saveBtn().disabled).toBe(false);

    pickPicture(container);
    await waitFor(() => expect(saveBtn().disabled).toBe(true));
    expect(createEntity).not.toHaveBeenCalled();

    resolveUpload(RESULT);
    await waitFor(() => expect(saveBtn().disabled).toBe(false));
  });

  it("drops the key again when an uploaded picture is removed before saving", async () => {
    // The omission test above only covers "never picked one". Removing after a
    // successful upload must return the payload to key-ABSENT, not leave
    // `image: undefined` behind for the backend to store verbatim.
    uploadCaseImage.mockResolvedValue(RESULT);
    createEntity.mockResolvedValue({ "@id": "x" });

    const { container } = render(<EntityCreate />);
    fillRequired(container);
    pickPicture(container);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remove picture/i })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: /remove picture/i }));

    submit();
    await waitFor(() => expect(createEntity).toHaveBeenCalled());
    expect("image" in createEntity.mock.calls[0][0]).toBe(false);
  });

  it("passes `disabled` down so the picker cannot start a late upload mid-save", async () => {
    // The field documents this prop as "set while the form is saving, so a
    // picker cannot start a late upload" — but only the page can honour it, and
    // deleting the prop here otherwise leaves every test green.
    uploadCaseImage.mockResolvedValue(RESULT);
    createEntity.mockReturnValue(new Promise(() => {})); // hold the create open

    const { container } = render(<EntityCreate />);
    fillRequired(container);
    pickPicture(container);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /replace picture/i })).toBeTruthy(),
    );

    submit();
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: /replace picture/i }) as HTMLButtonElement).disabled,
      ).toBe(true),
    );
    expect(
      (screen.getByRole("button", { name: /remove picture/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("rejects an `image` set through the extra-properties JSON box", () => {
    // The picture field owns the key; two writers would mean the spread order
    // silently decided which one won.
    const { container } = render(<EntityCreate />);
    fillRequired(container);
    fireEvent.change(container.querySelector("#extra")!, {
      target: { value: '{"image": "https://evil.example/x.jpg"}' },
    });

    expect(screen.getByText(/"image" is set by the fields above/i)).toBeTruthy();
    expect(saveBtn().disabled).toBe(true);
  });
});
