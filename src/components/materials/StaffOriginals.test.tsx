import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const getMaterialOriginal = vi.fn();
vi.mock("@/services/datalake-api", () => ({
  getMaterialOriginal: (...args: unknown[]) => getMaterialOriginal(...args),
}));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

import { staffOriginalsOf } from "@/lib/staff-originals";
import { StaffOriginals } from "./StaffOriginals";

describe("staffOriginalsOf", () => {
  it("is null for a public payload, which never carries the flags", () => {
    expect(staffOriginalsOf({ "@id": "x" })).toBeNull();
    expect(staffOriginalsOf(undefined)).toBeNull();
    expect(
      staffOriginalsOf({ "jawafdehi:staffOriginals": { document: false, transcript: false } }),
    ).toBeNull();
  });

  it("reads the staff flags", () => {
    expect(
      staffOriginalsOf({ "jawafdehi:staffOriginals": { document: true, transcript: "yes" } }),
    ).toEqual({ document: true, transcript: false });
  });
});

describe("StaffOriginals", () => {
  const assign = vi.fn();
  let openSpy: ReturnType<typeof vi.spyOn>;
  const tab = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };

  beforeEach(() => {
    getMaterialOriginal.mockReset();
    toastError.mockReset();
    tab.location.href = "";
    tab.close.mockReset();
    openSpy = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign },
    });
    assign.mockReset();
  });

  afterEach(() => openSpy.mockRestore());

  it("offers only the originals that exist", () => {
    render(<StaffOriginals tail="ag/1" flags={{ document: false, transcript: true }} />);
    expect(screen.queryByRole("button", { name: "View original" })).toBeNull();
    expect(screen.getByRole("button", { name: "Unredacted transcript" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Download unredacted transcript" }),
    ).toBeTruthy();
  });

  it("opens the tab inside the click, then points it at the signed URL", async () => {
    getMaterialOriginal.mockResolvedValue({ url: "https://signed.example/doc.pdf?sig=1" });
    render(<StaffOriginals tail="ag/1" flags={{ document: true, transcript: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "View original" }));
    expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.opener).toBeNull();
    await waitFor(() => expect(tab.location.href).toBe("https://signed.example/doc.pdf?sig=1"));
    expect(getMaterialOriginal).toHaveBeenCalledWith("ag/1", "document", false);
  });

  it("downloads in place without opening a tab", async () => {
    getMaterialOriginal.mockResolvedValue({ url: "https://signed.example/t.md?sig=2" });
    render(<StaffOriginals tail="ag/1" flags={{ document: true, transcript: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Download unredacted transcript" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://signed.example/t.md?sig=2"));
    expect(openSpy).not.toHaveBeenCalled();
    expect(getMaterialOriginal).toHaveBeenCalledWith("ag/1", "transcript", true);
  });

  it("closes the blank tab and says so when the API refuses", async () => {
    getMaterialOriginal.mockRejectedValue(new Error("403"));
    render(<StaffOriginals tail="ag/1" flags={{ document: true, transcript: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "View original" }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(tab.close).toHaveBeenCalled();
  });
});
