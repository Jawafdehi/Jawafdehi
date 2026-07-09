import { ReactNode, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ConfirmButtonProps {
  // The action to run once confirmed. Kept async so the dialog can show a
  // pending state and stay open until it settles.
  onConfirm: () => void | Promise<void>;
  // Trigger button content (icon + label).
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
}

// A confirm-then-act button for destructive/irreversible-feeling actions that
// aren't deletes (e.g. Close a case, Un-publish a live case, Dismiss a
// submission). Mirrors DeleteButton's pattern so a stray click can't take a
// case offline. Use for actions where a one-click mistake is costly.
export default function ConfirmButton({
  onConfirm,
  children,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "outline",
  size = "sm",
  disabled = false,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm();
      // Only close on success. Callers rethrow after surfacing their error, so
      // a rejection keeps the dialog open — the destructive action didn't
      // happen and the user shouldn't be left thinking it did.
      setOpen(false);
    } catch {
      // Swallow: the caller renders the failure in context (a toast / inline
      // error). Keeping the dialog open signals the action did not complete.
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      // Ignore outside-click / programmatic close while the action is in
      // flight, so the dialog can't vanish mid-request.
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onEscapeKeyDown={(e) => {
          // Escape shouldn't dismiss the dialog while the action runs.
          if (busy) e.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          {/* Plain button (not AlertDialogAction) so the dialog stays open
              until the async action settles, showing the pending state. */}
          <Button variant="destructive" onClick={handle} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
