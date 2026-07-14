import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import CaseworkLayout from "@/components/CaseworkLayout";
import { listReviews, submitReview, getReview, apiErrorMessage } from "@/services/casework-api";
import type { ReviewListItem, ReviewDetail } from "@/types/casework";
import { Button } from "@/components/ui/button";
import { ReviewRow } from "@/components/casework/ReviewRow";
import { ReviewResultView } from "@/components/casework/ReviewResultView";
import { Loader2, ArrowLeft, ExternalLink, RefreshCw, Play } from "lucide-react";

// Get the HTTP status / conflicting review id off an axios error without
// pulling in axios types here.
function errStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status;
}
function conflictReviewId(e: unknown): number | undefined {
  return (e as { response?: { data?: { review_id?: number } } })?.response?.data?.review_id;
}

// Per-case review page — the hub that HOSTS the reviews. Shows the case's whole
// run history (a run switcher) and the selected run's full breakdown inline, and
// is the only place a new review is triggered. There is no separate per-run URL;
// /admin/reviews/:id redirects here with ?run=<id>.
export default function CaseworkCaseReviews() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Title carried from the list/search click so a never-reviewed case still
  // shows a real title before its first run exists.
  const navTitle = (location.state as { title?: string } | null)?.title;

  const [runs, setRuns] = useState<ReviewListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const loadRuns = useCallback(
    async (isPoll = false) => {
      if (!slug) {
        if (!isPoll) setLoadingRuns(false);
        return;
      }
      try {
        // page_size=100 loads the whole history in one request (newest-first).
        const page = await listReviews({ slug, page_size: 100 });
        setRuns(page.results);
      } catch {
        if (!isPoll) setErr("Failed to load reviews for this case.");
      } finally {
        if (!isPoll) setLoadingRuns(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Pick which run's breakdown to show: keep the current one if still present,
  // else the ?run= deep-link (if valid), else the latest. Re-runs when the list
  // refreshes (polling) but preserves an explicit selection.
  useEffect(() => {
    if (!runs.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((cur) => {
      if (cur && runs.some((r) => r.id === cur)) return cur;
      const fromUrl = Number(searchParams.get("run"));
      if (fromUrl && runs.some((r) => r.id === fromUrl)) return fromUrl;
      return runs[0].id;
    });
  }, [runs, searchParams]);

  // Load the selected run's full detail (the breakdown).
  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    getReview(selectedId)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch(() => {
        if (active) setDetail(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Poll while the selected run is still in progress: refresh both its detail
  // and the run list (so the row's score/status settle). Recursive setTimeout so
  // a slow request can't pile up.
  useEffect(() => {
    const s = detail?.status;
    if (selectedId == null || (s !== "pending" && s !== "running")) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const [d] = await Promise.all([getReview(selectedId), loadRuns(true)]);
        if (active) setDetail(d);
      } catch {
        /* keep last-known detail; try again next tick */
      }
      if (active) timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 3000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [detail?.status, selectedId, loadRuns]);

  const selectRun = (id: number) => {
    setSelectedId(id);
    setSearchParams({ run: String(id) }, { replace: true });
  };

  // Trigger a fresh review for this case (the ONLY place a review is started).
  const onRunReview = async () => {
    setSubmitting(true);
    setErr("");
    try {
      const fresh = await submitReview({ slug });
      await loadRuns(true);
      selectRun(fresh.id);
    } catch (e: unknown) {
      const cid = conflictReviewId(e);
      if (errStatus(e) === 409 && cid) {
        // One is already in progress — jump to it instead of erroring.
        await loadRuns(true);
        selectRun(cid);
        setErr("A review is already in progress for this case.");
      } else {
        setErr(apiErrorMessage(e, "Failed to start review."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const latest = runs[0];
  const latestInProgress = latest?.status === "pending" || latest?.status === "running";
  const title = latest?.case_title || navTitle || slug;

  return (
    <CaseworkLayout>
      <div className="space-y-5">
        <button
          onClick={() => navigate("/admin/reviews")}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> All reviews
        </button>

        {/* Case header */}
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
              <div className="text-xs text-slate-400 mt-2">
                {runs.length} run{runs.length === 1 ? "" : "s"}
              </div>
            </div>
            <Button
              onClick={onRunReview}
              disabled={submitting || latestInProgress}
              title={
                latestInProgress
                  ? "A review is already in progress for this case"
                  : "Run a fresh review for this case against the current rules"
              }
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : runs.length ? (
                <RefreshCw className="h-4 w-4 mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {runs.length ? "Re-run review" : "Run review"}
            </Button>
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>

        {loadingRuns ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading runs…
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews for this case yet. Use “Run review” above to grade it.
          </p>
        ) : (
          <>
            {/* Run switcher */}
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b text-sm font-semibold">
                Runs ({runs.length})
              </div>
              <ul className="divide-y">
                {runs.map((r) => (
                  <ReviewRow
                    key={r.id}
                    review={r}
                    selected={r.id === selectedId}
                    onClick={() => selectRun(r.id)}
                  />
                ))}
              </ul>
            </div>

            {/* Selected run's full breakdown */}
            {detailLoading && !detail ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading review…
              </div>
            ) : detail ? (
              <ReviewResultView review={detail} />
            ) : null}
          </>
        )}
      </div>
    </CaseworkLayout>
  );
}
