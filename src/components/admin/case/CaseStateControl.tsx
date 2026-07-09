import { useState } from "react";
import { useTranslation } from "react-i18next";
import { patchCase, adminErrorMessage, type PatchOp } from "@/services/admin-api";
import { replaceOp, type CaseState } from "@/lib/jawafdehi-forms";
import { FieldError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// The transitions the UI offers from each state. The API (A2 +
// can_transition_case_state) is the authority — it re-checks the role and the
// BR-1..BR-4 publish gates; this map only shapes which buttons appear.
//
// Privileged targets (PUBLISHED / CLOSED / un-publish to DRAFT) are gated to
// admin/moderator in the UI; DRAFT⇄IN_REVIEW is available to any contributor.
// Labels / confirm copy are i18n keys under `admin.stateControl.*`, resolved at
// render so the control relabels on a language switch.
interface Transition {
  to: CaseState;
  labelKey: string;
  variant?: "default" | "outline" | "destructive";
  privileged?: boolean;
  // When set, the action requires a confirm dialog (destructive / hard to
  // undo). ``confirmKey`` is the base key: ``{key}Title`` + ``{key}Body``.
  confirmKey?: string;
}

const TRANSITIONS: Record<string, Transition[]> = {
  DRAFT: [
    { to: "IN_REVIEW", labelKey: "submitForReview", variant: "default" },
  ],
  IN_REVIEW: [
    { to: "PUBLISHED", labelKey: "publish", variant: "default", privileged: true },
    { to: "DRAFT", labelKey: "sendBackToDraft", variant: "outline" },
    {
      to: "CLOSED",
      labelKey: "close",
      variant: "destructive",
      privileged: true,
      confirmKey: "closeConfirm",
    },
  ],
  PUBLISHED: [
    {
      to: "DRAFT",
      labelKey: "unpublish",
      variant: "outline",
      privileged: true,
      confirmKey: "unpublishConfirm",
    },
    {
      to: "CLOSED",
      labelKey: "close",
      variant: "destructive",
      privileged: true,
      confirmKey: "closeConfirm",
    },
  ],
  CLOSED: [
    { to: "DRAFT", labelKey: "reopenDraft", variant: "outline", privileged: true },
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
  const { t } = useTranslation();
  const [busy, setBusy] = useState<CaseState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = (TRANSITIONS[state] ?? []).filter(
    (tr) => !tr.privileged || isModerator,
  );

  const transition = async (to: CaseState) => {
    setBusy(to);
    setError(null);
    try {
      const ops: PatchOp[] = [replaceOp("/state", to)];
      await patchCase(slug, ops);
      toast({ title: t("admin.stateControl.movedTo", { state: to }) });
      onTransitioned(to);
    } catch (err) {
      setError(adminErrorMessage(err, t("admin.stateControl.transitionFailed")));
      // Rethrow so a ConfirmButton-wrapped transition keeps its dialog open on
      // failure instead of closing as if it succeeded.
      throw err;
    } finally {
      setBusy(null);
    }
  };

  // Fire-and-forget wrapper for the plain (non-confirmed) transition buttons:
  // the error is already surfaced via setError, so swallow the rejection to
  // avoid an unhandled promise rejection.
  const transitionSafe = (to: CaseState) => {
    void transition(to).catch(() => {});
  };

  return (
    <div className="space-y-2 rounded-md border bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">
          {t("admin.stateControl.state")}
        </span>
        <Badge variant="secondary">{state || "—"}</Badge>
      </div>
      <FieldError message={error} />
      {available.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {isModerator
            ? t("admin.stateControl.noTransitions")
            : t("admin.stateControl.noTransitionsForRole")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((tr) => {
            const label = t(`admin.stateControl.${tr.labelKey}`);
            return tr.confirmKey ? (
              <ConfirmButton
                key={tr.to}
                variant={tr.variant ?? "outline"}
                size="sm"
                disabled={busy !== null}
                title={t(`admin.stateControl.${tr.confirmKey}Title`)}
                description={t(`admin.stateControl.${tr.confirmKey}Body`)}
                confirmLabel={label}
                onConfirm={() => transition(tr.to)}
              >
                {label}
              </ConfirmButton>
            ) : (
              <Button
                key={tr.to}
                type="button"
                size="sm"
                variant={tr.variant ?? "outline"}
                disabled={busy !== null}
                onClick={() => transitionSafe(tr.to)}
              >
                {busy === tr.to && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                {label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
