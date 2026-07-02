import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CaseworkLayout from "@/components/CaseworkLayout";
import {
  listReviewsGrouped,
  submitReview,
  buildSubmitPayload,
  regradeAll,
  apiErrorMessage,
} from "@/services/casework-api";
import type { GroupedCase, ReviewListItem, ReviewerInfo } from "@/types/casework";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dispositionColor, statusColor, fmtDate, fmtDur, scoreBand } from "@/lib/casework-ui";
import { Loader2, Plus, RefreshCw, Repeat } from "lucide-react";

const PAGE_SIZE = 20;

// Get the HTTP status off an axios error without pulling in axios types here.
function errStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status;
}
function conflictReviewId(e: unknown): number | undefined {
  return (e as { response?: { data?: { review_id?: number } } })?.response?.data?.review_id;
}

// Merge freshly-fetched case groups into the accumulated list: replace existing
// cases in place (by slug) and add new ones, keeping most-recently-active first
// (latest id desc mirrors the backend's ordering). Used so polling can refresh
// page 1 without discarding cases already loaded via "Load more".
function mergeGroups(prev: GroupedCase[], fresh: GroupedCase[]): GroupedCase[] {
  const bySlug = new Map(prev.map((g) => [g.slug, g]));
  for (const g of fresh) bySlug.set(g.slug, g);
  return [...bySlug.values()].sort((a, b) => (b.latest?.id ?? 0) - (a.latest?.id ?? 0));
}

// Distinct "provider·model" labels for the reviewer(s) that graded a run.
function reviewerLabels(reviewers: ReviewerInfo[] | null): string[] {
  if (!reviewers?.length) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const r of reviewers) {
    const label = r.model ? `${r.provider}·${r.model}` : r.provider;
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels;
}

export default function CaseworkReviews() {
  const navigate = useNavigate();
  const { isModerator } = useCaseworkAuth();
  const [groups, setGroups] = useState<GroupedCase[]>([]);
  const [regrading, setRegrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rerunningSlug, setRerunningSlug] = useState<string | null>(null);
  const [err, setErr] = useState("");
  // Separate from `err` (which renders under the submit input) so a regrade-all
  // failure surfaces next to the Regrade-all button, not the submit form.
  const [regradeErr, setRegradeErr] = useState("");
  const [conflictId, setConflictId] = useState<number | null>(null);

  // Load the first page of cases. When called by polling (isPoll), only merge the
  // fresh page-1 groups — don't touch pagination/loading/error state, so a
  // background refresh can't reset the user's "Load more" progress.
  const loadFirst = useCallback(async (isPoll = false) => {
    try {
      const page = await listReviewsGrouped({ page: 1, page_size: PAGE_SIZE });
      if (!isPoll) {
        setCount(page.count);
        setHasNext(Boolean(page.next));
        setNextPage(2);
      }
      setGroups((prev) => (prev.length ? mergeGroups(prev, page.results) : page.results));
    } catch {
      if (!isPoll) setErr("Failed to load reviews.");
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const page = await listReviewsGrouped({ page: nextPage, page_size: PAGE_SIZE });
      setCount(page.count);
      setHasNext(Boolean(page.next));
      setNextPage((p) => p + 1);
      setGroups((prev) => mergeGroups(prev, page.results));
    } catch {
      setErr("Failed to load more reviews.");
    } finally {
      setLoadingMore(false);
    }
  }, [nextPage]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  // Poll the first page while a case on it has an in-progress latest run. Scoped
  // to the newest PAGE_SIZE cases (where freshly submitted reviews land) since
  // polling only refreshes page 1.
  useEffect(() => {
    const anyRunning = groups
      .slice(0, PAGE_SIZE)
      .some((g) => g.latest?.status === "pending" || g.latest?.status === "running");
    if (!anyRunning) return;
    const t = setInterval(() => loadFirst(true), 3000);
    return () => clearInterval(t);
  }, [groups, loadFirst]);

  // Returns true on success (the component navigates away, so callers must not
  // touch state afterward); on failure the error is set and false is returned.
  const runSubmit = async (
    payload: Parameters<typeof submitReview>[0],
    fallback: string
  ): Promise<boolean> => {
    setErr("");
    setConflictId(null);
    try {
      const review = await submitReview(payload);
      navigate(`/admin/reviews/${review.id}`);
      return true;
    } catch (e: unknown) {
      setErr(apiErrorMessage(e, fallback));
      if (errStatus(e) === 409) setConflictId(conflictReviewId(e) ?? null);
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    const ok = await runSubmit(buildSubmitPayload(input), "Submit failed.");
    if (!ok) setSubmitting(false);
  };

  // Re-run: submit a fresh review for an already-reviewed case slug.
  const onRerun = async (gslug: string) => {
    setRerunningSlug(gslug);
    const ok = await runSubmit({ slug: gslug }, "Re-run failed.");
    if (!ok) setRerunningSlug(null);
  };

  // F9 — regrade all reviewable cases against the current rules (admin/
  // moderator). POSTs /api/casework/reviews/regrade-all/; refresh page 1 so the
  // newly-queued runs appear.
  const onRegradeAll = async () => {
    setRegrading(true);
    setRegradeErr("");
    try {
      const res = await regradeAll();
      toast({
        title: "Regrade queued",
        description: `${res.regrading} case${res.regrading === 1 ? "" : "s"} queued for regrade.`,
      });
      await loadFirst(true);
    } catch (e: unknown) {
      setRegradeErr(apiErrorMessage(e, "Regrade-all failed."));
    } finally {
      setRegrading(false);
    }
  };

  const shownReviews = groups.reduce((n, g) => n + (g.executions?.length ?? 0), 0);

  return (
    <CaseworkLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Case reviews</h1>
            <p className="text-sm text-muted-foreground">
              Submit a case slug, court case number, or case URL to run a multi-dimensional
              quality review.
            </p>
          </div>
          {isModerator && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={regrading}
                title="Queue a fresh review for every reviewable case against the current rules"
                onClick={onRegradeAll}
              >
                {regrading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Repeat className="mr-1 h-4 w-4" />
                )}
                Regrade all
              </Button>
              {regradeErr && (
                <p className="text-sm text-red-600 text-right">{regradeErr}</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 items-start">
          <div className="flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="slug, court case no. (special:081-CR-0136), or case URL"
            />
            {err && (
              <p className="text-sm text-red-600 mt-1">
                {err}
                {conflictId != null && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="underline font-medium"
                      onClick={() => navigate(`/admin/reviews/${conflictId}`)}
                    >
                      View existing review
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
          <Button type="submit" disabled={submitting || !input.trim()}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Review
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews yet. Submit a case above.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.slug} className="bg-white border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-slate-500 truncate">{g.slug}</div>
                    <div className="text-sm font-medium truncate">{g.case_title || "—"}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {g.executions?.length ?? 0} review
                      {(g.executions?.length ?? 0) === 1 ? "" : "s"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={rerunningSlug === g.slug}
                      title="Run a fresh review for this case against the current rules"
                      onClick={() => onRerun(g.slug)}
                    >
                      {rerunningSlug === g.slug ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      )}
                      Re-run
                    </Button>
                  </div>
                </div>
                <ul className="divide-y">
                  {(g.executions ?? []).map((r) => (
                    <ReviewRow
                      key={r.id}
                      review={r}
                      onClick={() => navigate(`/admin/reviews/${r.id}`)}
                    />
                  ))}
                </ul>
              </div>
            ))}

            {hasNext && (
              <div className="flex justify-center pt-1">
                <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : null}
                  Load more
                </Button>
              </div>
            )}
            <p className="text-center text-xs text-slate-400">
              Showing {groups.length} of {count} case{count === 1 ? "" : "s"} ({shownReviews}{" "}
              review{shownReviews === 1 ? "" : "s"})
            </p>
          </div>
        )}
      </div>
    </CaseworkLayout>
  );
}

function ReviewRow({ review: r, onClick }: { review: ReviewListItem; onClick: () => void }) {
  const reviewers = reviewerLabels(r.reviewers);
  return (
    <li
      className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer"
      onClick={onClick}
    >
      <span className="text-xs font-mono text-slate-400 w-12">#{r.id}</span>
      <span className="text-xs text-slate-500 w-40 hidden md:inline">
        🕓 {fmtDate(r.completed_at || r.created_at)}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(r.status)}`}>
        {r.status === "running" || r.status === "pending" ? r.stage || r.status : r.status}
      </span>
      {reviewers.length > 0 && (
        <span
          className="text-xs text-slate-400 font-mono hidden lg:inline truncate max-w-[14rem]"
          title={`Graded by ${reviewers.join(", ")}`}
        >
          {reviewers.join(", ")}
        </span>
      )}
      <span className="flex-1" />
      {r.overall_score != null && (
        <span
          className="text-sm font-bold w-10 text-right"
          style={{ color: scoreBand(r.overall_score) }}
        >
          {r.overall_score}
        </span>
      )}
      {r.disposition && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${dispositionColor(r.disposition)}`}
        >
          {r.disposition}
        </span>
      )}
      {r.duration_seconds != null && (
        <span className="text-xs text-slate-400 w-14 text-right hidden lg:inline">
          {fmtDur(r.duration_seconds)}
        </span>
      )}
    </li>
  );
}
