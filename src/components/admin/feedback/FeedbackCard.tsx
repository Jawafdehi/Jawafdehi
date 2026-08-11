import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { triageFeedback, feedbackErrorMessage } from "@/services/feedback-api";
import {
  FEEDBACK_STATUSES,
  type FeedbackStatus,
  type FeedbackSubmissionRow,
} from "@/types/feedback";
import { statusColor, statusLabel, typeColor, typeLabel } from "@/lib/feedback-ui";
import { fmtDate } from "@/lib/casework-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Paperclip, Save } from "lucide-react";

interface FeedbackCardProps {
  row: FeedbackSubmissionRow;
  /** Lets the queue replace its copy of the row after a successful save. */
  onSaved?: (row: FeedbackSubmissionRow) => void;
  /** Detail view shows the body unconditionally; the queue collapses it. */
  defaultExpanded?: boolean;
}

// One submission, with its triage controls. Shared by the queue and the
// deep-linked detail page so the two can't drift apart.
//
// What is NOT here, on purpose: the reporter's name, contact details, IP or
// user agent, and the attachment itself. The API doesn't send them. The two
// presence chips say only "something exists that you'd need Django admin to
// see", which is what tells a triager to escalate rather than assume anonymity.
export default function FeedbackCard({
  row,
  onSaved,
  defaultExpanded = false,
}: FeedbackCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [status, setStatus] = useState<FeedbackStatus>(row.status);
  const [notes, setNotes] = useState(row.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the draft when the underlying row changes identity (pagination
  // reuses this component for a different submission) or when a save elsewhere
  // updated it. Keyed on the values themselves so a refresh that returns the
  // same data doesn't stomp an in-progress edit with identical content.
  useEffect(() => {
    setStatus(row.status);
    setNotes(row.adminNotes ?? "");
  }, [row.id, row.status, row.adminNotes]);

  const dirty = status !== row.status || notes !== (row.adminNotes ?? "");

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await triageFeedback(row.id, { status, adminNotes: notes });
      toast({
        title: t("admin.feedback.saved", "Triage saved"),
        description: `#${row.id}`,
      });
      onSaved?.(updated);
    } catch (err) {
      setError(
        feedbackErrorMessage(
          err,
          t("admin.feedback.saveFailed", "Could not save triage."),
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">#{row.id}</span>
            <span
              className={`rounded border px-1.5 py-0.5 text-xs ${typeColor(row.feedbackType)}`}
            >
              {typeLabel(row.feedbackType, t)}
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 text-xs ${statusColor(row.status)}`}
            >
              {statusLabel(row.status, t)}
            </span>
          </div>
          <div className="mt-1 font-medium">{row.subject || "—"}</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{fmtDate(row.submittedAt)}</span>
            {row.relatedPage && <span>{row.relatedPage}</span>}
            {row.hasContactInfo && (
              <span
                className="inline-flex items-center gap-1"
                title={t(
                  "admin.feedback.contactHint",
                  "Contact details were supplied. They are not shown here — ask an administrator.",
                )}
              >
                <Mail className="h-3 w-3" />
                {t("admin.feedback.hasContact", "Contactable")}
              </span>
            )}
            {row.hasAttachment && (
              <span
                className="inline-flex items-center gap-1"
                title={t(
                  "admin.feedback.attachmentHint",
                  "A file was attached. It is not shown here — ask an administrator.",
                )}
              >
                <Paperclip className="h-3 w-3" />
                {t("admin.feedback.hasAttachment", "Attachment")}
              </span>
            )}
          </div>
        </div>
        {!defaultExpanded && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded
              ? t("admin.feedback.hide", "Hide")
              : t("admin.feedback.open", "Open")}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">
              {t("admin.feedback.description", "What was reported")}
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {row.description || "—"}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label
                className="block text-xs font-semibold uppercase text-slate-500"
                htmlFor={`feedback-status-${row.id}`}
              >
                {t("admin.feedback.statusLabel", "Status")}
              </label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as FeedbackStatus)}
              >
                <SelectTrigger id={`feedback-status-${row.id}`} className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[240px] flex-1 space-y-1">
              <label
                className="block text-xs font-semibold uppercase text-slate-500"
                htmlFor={`feedback-notes-${row.id}`}
              >
                {t("admin.feedback.notesLabel", "Internal notes")}
              </label>
              <Textarea
                id={`feedback-notes-${row.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={t(
                  "admin.feedback.notesPlaceholder",
                  "Visible to staff only",
                )}
              />
            </div>
            <Button onClick={save} disabled={saving || !dirty}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              {t("admin.common.save", "Save")}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {row.updatedAt && row.updatedAt !== row.submittedAt && (
            <p className="text-xs text-muted-foreground">
              {t("admin.feedback.lastUpdated", "Last updated {{when}}", {
                when: fmtDate(row.updatedAt),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
