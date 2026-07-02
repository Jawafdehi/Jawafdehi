import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { adminErrorMessage } from "@/services/admin-api";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteButtonProps {
  // The async delete call (already bound to its resource key).
  onDelete: () => Promise<void>;
  // Human label of the thing being deleted (shown in the confirm dialog).
  resourceLabel: string;
  // Called after a successful delete (e.g. navigate away or refetch a list).
  onDeleted?: () => void;
  // Trigger button appearance.
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  buttonLabel?: string;
  // Most backend deletes are SOFT (204) — say so in the copy unless told hard.
  hard?: boolean;
}

// A confirm-then-delete button. Wraps the delete call in an AlertDialog so a
// stray click can't destroy data; on success it toasts + calls onDeleted.
// Shared by every admin resource (entities, court cases, materials, cases,
// sources) so the delete flow is uniform.
export default function DeleteButton({
  onDelete,
  resourceLabel,
  onDeleted,
  variant = "outline",
  size = "sm",
  buttonLabel = "Delete",
  hard = false,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onDelete();
      toast({ title: `${resourceLabel} deleted` });
      setOpen(false);
      onDeleted?.();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: adminErrorMessage(err, `Could not delete ${resourceLabel}.`),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className="text-red-600">
          <Trash2 className="mr-1 h-4 w-4" />
          {buttonLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {resourceLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {hard
              ? "This permanently removes the record and cannot be undone."
              : "This soft-deletes the record (it can be restored by an admin). It will disappear from the public site and the admin lists."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          {/* Not AlertDialogAction: it auto-closes before the async call
              resolves, hiding the pending/error state. A plain button lets us
              keep the dialog open until the delete settles. */}
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1 h-4 w-4" />
            )}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
