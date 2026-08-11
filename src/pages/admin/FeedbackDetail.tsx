import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFeedback, feedbackErrorMessage } from "@/services/feedback-api";
import type { FeedbackSubmissionRow } from "@/types/feedback";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { FormError } from "@/components/admin/FormError";
import FeedbackCard from "@/components/admin/feedback/FeedbackCard";
import { ArrowLeft, Loader2 } from "lucide-react";

// One submission, addressed directly. This is what the case-report notification
// email links to (``FRONTEND_BASE_URL/admin/feedback/<id>``), so it has to
// resolve a single id without depending on that row being on the queue's first
// page — which is why it fetches by id rather than deep-linking into the list.
export default function FeedbackDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { isModerator: allowed } = useCaseworkAuth();

  const [row, setRow] = useState<FeedbackSubmissionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setRow(await getFeedback(id));
    } catch (err) {
      setError(
        feedbackErrorMessage(
          err,
          t("admin.feedback.notFound", "That submission could not be loaded."),
        ),
      );
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (allowed) load();
  }, [load, allowed]);

  if (!allowed) {
    return (
      <FormError
        message={t(
          "admin.feedback.noPermission",
          "Feedback is available to caseworkers and administrators.",
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/admin/feedback"
        className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.feedback.backToQueue", "Back to feedback")}
      </Link>

      <FormError message={error} />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : row ? (
        <FeedbackCard row={row} onSaved={setRow} defaultExpanded />
      ) : null}
    </div>
  );
}
