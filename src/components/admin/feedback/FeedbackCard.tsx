import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { triageFeedback } from "@/services/feedback-api";
import { extractErrorMessage } from "@/services/http";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  type AdminFeedbackType,
  type FeedbackStatus,
  type FeedbackSubmissionRow,
  type FeedbackTriagePatch,
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
  const [type, setType] = useState<AdminFeedbackType>(row.feedbackType);
  const [notes, setNotes] = useState(row.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the draft only when this card is pointed at a DIFFERENT submission
  // (the queue reuses the component across pages). Deliberately NOT keyed on
  // row.status / row.adminNotes: those change when a save of THIS row returns,
  // and re-seeding then would overwrite anything typed while the request was in
  // flight — silently, right as the success toast appears.
  const shownId = useRef(row.id);
  useEffect(() => {
    if (shownId.current === row.id) return;
    shownId.current = row.id;
    setStatus(row.status);
    setType(row.feedbackType);
    setNotes(row.adminNotes ?? "");
    setError(null);
  }, [row.id, row.status, row.feedbackType, row.adminNotes]);

  const dirty =
    status !== row.status ||
    type !== row.feedbackType ||
    notes !== (row.adminNotes ?? "");

  const save = async () => {
    setSaving(true);
    setError(null);
    // Send ONLY what changed. A blanket PATCH of every writable field would
    // carry this tab's stale copy of the others, so saving a note would silently
    // revert a status another triager set in the meantime.
    const patch: FeedbackTriagePatch = {};
    if (status !== row.status) patch.status = status;
    if (type !== row.feedbackType) patch.feedbackType = type;
    if (notes !== (row.adminNotes ?? "")) patch.adminNotes = notes;
    try {
      const updated = await triageFeedback(row.id, patch);
      toast({
        title: t("admin.feedback.saved", "Triage saved"),
        description: `#${row.id}`,
      });
      onSaved?.(updated);
    } catch (err) {
      setError(
        extractErrorMessage(
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
              : t("admin.common.open", "Open")}
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
                disabled={saving}
              >
                <SelectTrigger id={`feedback-status-${row.id}`} className="h-9 w-[160px]">
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
            <div className="space-y-1">
              <label
                className="block text-xs font-semibold uppercase text-slate-500"
                htmlFor={`feedback-type-${row.id}`}
              >
                {t("admin.feedback.typeLabel", "Type")}
              </label>
              {/* Reclassification: the public form lets anyone file a corruption
                  allegation as "general", and only case_report is alerted on.
                  This is the only surface that can correct it. */}
              <Select
                value={type}
                onValueChange={(v) => setType(v as AdminFeedbackType)}
                disabled={saving}
              >
                <SelectTrigger id={`feedback-type-${row.id}`} className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {typeLabel(ft, t)}
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
                disabled={saving}
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

          {/* `updatedAt !== submittedAt` would ALWAYS be true: auto_now_add and
              auto_now stamp from two separate now() calls, so they differ by
              microseconds even on an untouched row. Compare with a tolerance so
              this means "someone has looked at this". */}
          {hasBeenTriaged(row) && (
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

// Treat sub-second gaps as "never triaged" — see the comment at the call site.
function hasBeenTriaged(row: FeedbackSubmissionRow): boolean {
  if (!row.updatedAt || !row.submittedAt) return false;
  const updated = new Date(row.updatedAt).getTime();
  const submitted = new Date(row.submittedAt).getTime();
  if (Number.isNaN(updated) || Number.isNaN(submitted)) return false;
  return updated - submitted > 1000;
}
