import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";
import { listReviews } from "@/services/casework-api";
import type { ReviewListItem } from "@/types/casework";
import { scoreBand, dispositionColor, statusColor } from "@/lib/casework-ui";

// Compact "latest AI review" badge for the case edit page, shown to the right of
// the State control. It links to the case's full review history
// (/admin/reviews/case/<slug>) and surfaces the newest run at a glance: its
// score + disposition once scored, or its status while pending/running/failed.
//
// Degrades quietly by design — a case with no reviews (or an unreachable review
// endpoint on an older backend) renders a muted "no review" link, never an error
// box — so it is safe to show for any case regardless of its review state.
export default function CaseReviewScoreBadge({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [latest, setLatest] = useState<ReviewListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        // The flat list is newest-first, so a single-row page is the latest run.
        const page = await listReviews({ slug, page_size: 1 });
        if (alive) setLatest(page.results[0] ?? null);
      } catch {
        // Degrade quietly (no reviews / older backend) — see the note above.
        if (alive) setLatest(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <span className="inline-flex items-center text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        <span className="sr-only">{t("admin.caseForm.reviewBadge.loading")}</span>
      </span>
    );
  }

  return (
    <Link
      to={`/admin/reviews/case/${encodeURIComponent(slug)}`}
      className="inline-flex items-center gap-1.5 text-xs hover:underline"
      title={t("admin.caseForm.reviewBadge.linkTitle")}
    >
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {latest == null ? (
        <span className="text-muted-foreground">
          {t("admin.caseForm.reviewBadge.none")}
        </span>
      ) : latest.overall_score != null ? (
        <>
          <span className="text-muted-foreground">
            {t("admin.caseForm.reviewBadge.label")}
          </span>
          <span
            className="font-bold"
            style={{ color: scoreBand(latest.overall_score) }}
          >
            {latest.overall_score}
          </span>
          {latest.disposition && (
            <span
              className={`rounded-full border px-1.5 py-0.5 ${dispositionColor(latest.disposition)}`}
            >
              {latest.disposition}
            </span>
          )}
        </>
      ) : (
        <span
          className={`rounded-full border px-1.5 py-0.5 ${statusColor(latest.status)}`}
        >
          {latest.stage || latest.status}
        </span>
      )}
    </Link>
  );
}
