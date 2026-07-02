import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// The toast hook is a side-effect; stub it so we can assert it fired.
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: unknown[]) => toast(...a) }));

import DeleteButton from "./DeleteButton";

// The last button labelled "Delete" is the confirm action inside the dialog
// (the first is the trigger that's still in the DOM).
function confirmButton(): HTMLElement {
  const btns = screen.getAllByRole("button", { name: /delete/i });
  return btns[btns.length - 1];
}

beforeEach(() => {
  toast.mockClear();
});

describe("DeleteButton", () => {
  it("only calls onDelete after the confirm dialog is confirmed", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(
      <DeleteButton
        resourceLabel="entity"
        onDelete={onDelete}
        onDeleted={onDeleted}
      />,
    );

    // Trigger click opens the dialog but does NOT delete yet.
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(await screen.findByText(/delete entity\?/i)).toBeTruthy();

    // Confirm inside the dialog -> the delete runs, toast fires, onDeleted runs.
    fireEvent.click(confirmButton());
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "entity deleted" }),
    );
  });

  it("does not delete when the dialog is cancelled", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<DeleteButton resourceLabel="source" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
