import { useState } from "react";
import { patchCase, adminErrorMessage, type PatchOp } from "@/services/admin-api";
import { replaceOp, type CaseState } from "@/lib/jawafdehi-forms";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// The transitions the UI offers from each state. The API (A2 +
// can_transition_case_state) is the authority — it re-checks the role and the
// BR-1..BR-4 publish gates; this map only shapes which buttons appear.
//
// Privileged targets (PUBLISHED / CLOSED / un-publish to DRAFT) are gated to
// admin/moderator in the UI; DRAFT⇄IN_REVIEW is available to any contributor.
interface Transition {
  to: CaseState;
  label: string;
  variant?: "default" | "outline" | "destructive";
  privileged?: boolean;
}

const TRANSITIONS: Record<string, Transition[]> = {
  DRAFT: [{ to: "IN_REVIEW", label: "Submit for review", variant: "default" }],
  IN_REVIEW: [
    { to: "PUBLISHED", label: "Publish", variant: "default", privileged: true },
    { to: "DRAFT", label: "Send back to draft", variant: "outline" },
    { to: "CLOSED", label: "Close", variant: "destructive", privileged: true },
  ],
  PUBLISHED: [
    { to: "DRAFT", label: "Un-publish", variant: "outline", privileged: true },
    { to: "CLOSED", label: "Close", variant: "destructive", privileged: true },
  ],
  CLOSED: [
    { to: "DRAFT", label: "Reopen (draft)", variant: "outline", privileged: true },
  ],
};

interface Props {
  slug: string;
  state: string;
  isModerator: boolean;
  // Called after a successful transition so the parent can reload the case.
  onTransitioned: (to: CaseState) => void;
}

// F2 — state transition control. PATCHes a single replace on /state (§3). The
// backend applies case.publish()/delete() and enforces the gates.
export default function CaseStateControl({
  slug,
  state,
  isModerator,
  onTransitioned,
}: Props) {
  const [busy, setBusy] = useState<CaseState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = (TRANSITIONS[state] ?? []).filter(
    (t) => !t.privileged || isModerator,
  );

  const transition = async (to: CaseState) => {
    setBusy(to);
    setError(null);
    try {
      const ops: PatchOp[] = [replaceOp("/state", to)];
      await patchCase(slug, ops);
      toast({ title: `Case moved to ${to}` });
      onTransitioned(to);
    } catch (err) {
      setError(adminErrorMessage(err, "Transition failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">State</span>
        <Badge variant="secondary">{state || "—"}</Badge>
      </div>
      <FieldError message={error} />
      {available.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No transitions available from this state
          {!isModerator ? " for your role" : ""}.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((t) => (
            <Button
              key={t.to}
              type="button"
              size="sm"
              variant={t.variant ?? "outline"}
              disabled={busy !== null}
              onClick={() => transition(t.to)}
            >
              {busy === t.to && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
