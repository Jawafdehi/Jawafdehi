import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CaseworkLayout from "@/components/CaseworkLayout";
import { listReviews, submitReview, apiErrorMessage } from "@/services/casework-api";
import type { ReviewListItem } from "@/types/casework";
import { Button } from "@/components/ui/button";
import { ReviewRow } from "@/components/casework/ReviewRow";
import { dispositionColor, statusColor, fmtDate, scoreBand } from "@/lib/casework-ui";
import { Loader2, ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";

// Per-case review page: a case's whole run history (newest-first) plus its
// latest score summary. The full per-run breakdown (rules, radar, sources)
// lives one level deeper on the run detail page (/admin/reviews/:id).
export default function CaseworkCaseReviews() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [rerunning, setRerunning] = useState(false);

  const load = useCallback(
    async (isPoll = false) => {
      if (!slug) return;
      try {
        // page_size=100: a single case rarely has more runs than that, so this
        // loads the whole history in one request (newest-first from the backend).
        const page = await listReviews({ slug, page_size: 100 });
        setRuns(page.results);
      } catch {
        if (!isPoll) setErr("Failed to load reviews for this case.");
      } finally {
        if (!isPoll) setLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the newest run is still in progress.
  useEffect(() => {
    const latest = runs[0];
    if (latest?.status === "pending" || latest?.status === "running") {
      const t = setInterval(() => load(true), 3000);
      return () => clearInterval(t);
    }
  }, [runs, load]);

  const onRerun = async () => {
    setRerunning(true);
    setErr("");
    try {
      const fresh = await submitReview({ slug });
      navigate(`/admin/reviews/${fresh.id}`);
    } catch (e: unknown) {
      setErr(apiErrorMessage(e, "Re-run failed."));
      setRerunning(false);
    }
  };

  const latest = runs[0];
  const title = latest?.case_title || slug;

  return (
    <CaseworkLayout>
      <div className="space-y-5">
        <button
          onClick={() => navigate("/admin/reviews")}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> All reviews
        </button>

        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="font-mono text-xs text-slate-500">{slug}</div>
              <h1 className="text-lg font-bold">{title}</h1>
              <a
                href={`/case/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View case on jawafdehi.org
              </a>
              {latest && (
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full border ${statusColor(latest.status)}`}
                  >
                    {latest.status === "running" || latest.status === "pending"
                      ? latest.stage || latest.status
                      : latest.status}
                  </span>
                  <span className="text-slate-400">
                    🕓 {fmtDate(latest.completed_at || latest.created_at)}
                  </span>
                  <span className="text-slate-400">
                    {runs.length} run{runs.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-3">
              {latest?.overall_score != null && (
                <div className="text-right">
                  <div
                    className="text-3xl font-extrabold"
                    style={{ color: scoreBand(latest.overall_score) }}
                  >
                    {latest.overall_score}
                  </div>
                  {latest.disposition && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${dispositionColor(latest.disposition)}`}
                    >
                      {latest.disposition}
                    </span>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onRerun}
                disabled={rerunning}
                title="Run a fresh review for this case against the current rules"
              >
                {rerunning ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Re-run
              </Button>
            </div>
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>

        {/* Run history */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading runs…
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews for this case yet. Use Re-run above to grade it.
          </p>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b text-sm font-semibold">
              Runs ({runs.length})
            </div>
            <ul className="divide-y">
              {runs.map((r) => (
                <ReviewRow
                  key={r.id}
                  review={r}
                  onClick={() => navigate(`/admin/reviews/${r.id}`)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </CaseworkLayout>
  );
}
