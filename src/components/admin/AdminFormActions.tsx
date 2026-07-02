import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

// The submit / cancel (/ optional delete) button row shared by the admin forms.
// The submit button shows a spinner while saving; the delete slot floats right.
interface AdminFormActionsProps {
  saving: boolean;
  canSave: boolean;
  submitLabel: string;
  onCancel: () => void;
  // Optional delete control (e.g. a <DeleteButton/>), floated to the right in
  // edit mode. Omitted on create forms.
  deleteSlot?: ReactNode;
}

export default function AdminFormActions({
  saving,
  canSave,
  submitLabel,
  onCancel,
  deleteSlot,
}: AdminFormActionsProps) {
  return (
    <div className="flex gap-2">
      <Button type="submit" disabled={!canSave}>
        {saving ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-1 h-4 w-4" />
        )}
        {submitLabel}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      {deleteSlot ? <div className="ml-auto">{deleteSlot}</div> : null}
    </div>
  );
}
