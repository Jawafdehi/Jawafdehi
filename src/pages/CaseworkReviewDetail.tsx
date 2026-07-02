import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CaseworkLayout from "@/components/CaseworkLayout";
import { getReview, submitReview } from "@/services/casework-api";
import type { ReviewDetail, RuleResult, SourceSummary } from "@/types/casework";
import { Button } from "@/components/ui/button";
import {
  dispositionColor,
  statusColor,
  fmtDate,
  fmtDur,
  scoreBand,
  radarChartSvg,
  mdToHtml,
} from "@/lib/casework-ui";
import { Loader2, ArrowLeft, ChevronDown, FileText, ExternalLink, RefreshCw } from "lucide-react";

type Filter = "all" | "needs" | "llm" | "deterministic" | "gates";

function needsAddressing(rr: RuleResult, passT: number): boolean {
  return rr.gate_failed || rr.issues.length > 0 || rr.suggestions.length > 0 || rr.score < passT;
}

export default function CaseworkReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [source, setSource] = useState<SourceSummary | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rerunning, setRerunning] = useState(false);

  const onRerun = useCallback(async () => {
    if (!review) return;
    setRerunning(true);
    try {
      const fresh = await submitReview({ slug: review.slug });
      navigate(`/admin/reviews/${fresh.id}`);
    } finally {
      setRerunning(false);
    }
  }, [review, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getReview(Number(id));
      setReview(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while running.
  useEffect(() => {
    if (!review) return;
    if (review.status === "pending" || review.status === "running") {
      const t = setInterval(load, 3000);
      return () => clearInterval(t);
    }
  }, [review, load]);

  const result = review?.result || null;
  const passT = result?.thresholds?.pass ?? 80;

  const grouped = useMemo(() => {
    const g = new Map<string, RuleResult[]>();
    for (const rr of result?.rules || []) {
      if (!g.has(rr.category)) g.set(rr.category, []);
      g.get(rr.category)!.push(rr);
    }
    return g;
  }, [result]);

  const visible = (rr: RuleResult): boolean => {
    switch (filter) {
      case "needs":
        return needsAddressing(rr, passT);
      case "llm":
        return rr.kind === "llm";
      case "deterministic":
        return rr.kind === "deterministic";
      case "gates":
        return rr.is_gate;
      default:
        return true;
    }
  };

  if (loading) {
    return (
      <CaseworkLayout>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading review…
        </div>
      </CaseworkLayout>
    );
  }

  if (!review) {
    return (
      <CaseworkLayout>
        <p className="text-sm text-muted-foreground">Review not found.</p>
      </CaseworkLayout>
    );
  }

  const inProgress = review.status === "pending" || review.status === "running";

  return (
    <CaseworkLayout>
      <div className="space-y-5">
        <button
          onClick={() => navigate("/admin/reviews")}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> All reviews
        </button>

        {/* Hero */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="font-mono text-xs text-slate-500">{review.slug}</div>
              <h1 className="text-lg font-bold">{review.case_title || review.slug}</h1>
              <a
                href={`/case/${review.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View case on jawafdehi.org
              </a>
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                <span className={`px-2 py-0.5 rounded-full border ${statusColor(review.status)}`}>
                  {inProgress ? review.stage || review.status : review.status}
                </span>
                {review.case_type && (
                  <span className="px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                    {result?.case_type?.label || review.case_type}
                  </span>
                )}
                <span className="text-slate-400">🕓 {fmtDate(review.completed_at || review.created_at)}</span>
                {review.duration_seconds != null && (
                  <span className="text-slate-400">⏱ {fmtDur(review.duration_seconds)}</span>
                )}
                <span className="text-slate-400">
                  sources {review.sources_converted}/{review.source_count}
                </span>
                {review.reviewers && review.reviewers.length > 0 && (
                  <span
                    className="text-slate-400 font-mono"
                    title={review.reviewers
                      .map((rv) => `${rv.tier}: ${rv.provider}·${rv.model || "?"} (${rv.calls})`)
                      .join(", ")}
                  >
                    🤖{" "}
                    {Array.from(
                      new Set(
                        review.reviewers.map((rv) =>
                          rv.model ? `${rv.provider}·${rv.model}` : rv.provider
                        )
                      )
                    ).join(", ")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              {result && (
                <div className="text-right">
                  <div className="text-3xl font-extrabold" style={{ color: scoreBand(result.overall_score) }}>
                    {result.overall_score}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${dispositionColor(result.disposition)}`}
                  >
                    {result.disposition}
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onRerun}
                disabled={rerunning || inProgress}
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

          {inProgress && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Review in progress — stage: {review.stage || review.status}. This page refreshes automatically.
            </div>
          )}

          {review.status === "failed" && (
            <pre className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3 whitespace-pre-wrap max-h-48 overflow-auto">
              {review.error}
            </pre>
          )}

          {/* Radar chart */}
          {result && result.categories.length >= 3 && (
            <div className="mt-4 max-w-md mx-auto">
              <div dangerouslySetInnerHTML={{ __html: radarChartSvg(result.categories) }} />
            </div>
          )}

          {result?.narrative && (
            <p className="mt-3 text-sm text-slate-700 italic border-l-2 border-slate-200 pl-3">
              {result.narrative}
            </p>
          )}
        </div>

        {/* Sources */}
        {result && result.source_summary.length > 0 && (
          <div className="bg-white border rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Sources ({result.source_summary.length})</h2>
            <ul className="space-y-1.5">
              {result.source_summary.map((s, i) => {
                const ok =
                  s.conversion_status === "converted" || s.conversion_status === "attached";
                return (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          ok
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {s.conversion_status}
                      </span>
                      <span className="flex-1 truncate" title={s.title}>
                        {s.title || "(untitled)"}
                      </span>
                      <span className="text-xs text-slate-400">{s.markdown_chars} chars</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSource(s);
                          setShowRaw(false);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </div>
                    {/* Surface the conversion failure cause instead of hiding it
                        behind an empty "0 chars" / empty View. */}
                    {!ok && s.conversion_note && (
                      <p className="mt-0.5 ml-1 text-xs text-amber-700 break-words">
                        ⚠ {s.conversion_note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Rule results */}
        {result && (
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {(["all", "needs", "llm", "deterministic", "gates"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    filter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "needs"
                    ? "Needs addressing"
                    : f === "llm"
                    ? "LLM only"
                    : f === "deterministic"
                    ? "Deterministic only"
                    : "Gates only"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {[...grouped.entries()].map(([cat, rules]) => {
                const vis = rules.filter(visible);
                // In "Needs addressing", surface the worst rules first.
                if (filter === "needs") {
                  vis.sort((a, b) => a.score - b.score);
                }
                if (vis.length === 0) return null;
                const catScore = result.categories.find((c) => c.category === cat)?.score;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm font-semibold">{cat}</h3>
                      {catScore != null && (
                        <span
                          className="text-xs font-bold"
                          style={{ color: scoreBand(catScore) }}
                        >
                          {catScore}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-2">
                      {vis.map((rr) => (
                        <RuleCard
                          key={rr.key}
                          rr={rr}
                          expanded={!!expanded[rr.key]}
                          onToggle={() =>
                            setExpanded((e) => ({ ...e, [rr.key]: !e[rr.key] }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Source modal */}
      {source && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSource(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{source.title}</div>
                <div className="text-xs text-slate-400">{source.source_type}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRaw((v) => !v)}>
                  {showRaw ? "Rendered" : "Raw"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSource(null)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-auto text-sm">
              {!(source.conversion_status === "converted" || source.conversion_status === "attached") && source.conversion_note ? (
                // No converted text — show WHY (e.g. "Conversion failed: ...").
                <p className="text-amber-700 break-words">⚠ {source.conversion_note}</p>
              ) : showRaw ? (
                <pre className="whitespace-pre-wrap text-xs">{source.markdown || "(no markdown)"}</pre>
              ) : (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: mdToHtml(source.markdown || "_(no markdown)_") }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </CaseworkLayout>
  );
}

function RuleCard({
  rr,
  expanded,
  onToggle,
}: {
  rr: RuleResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`border rounded-lg p-3 ${rr.gate_failed ? "border-red-300 bg-red-50/40" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{rr.title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
              {rr.kind}
            </span>
            {rr.is_gate && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                gate ≥ {rr.gate_min}
              </span>
            )}
            {rr.gate_failed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                GATE FAILED
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold" style={{ color: scoreBand(rr.score) }}>
            {rr.score}
          </div>
          {rr.kind === "llm" && (
            <div className="text-[10px] text-slate-400">
              μ{rr.score} · σ{rr.std} · {rr.confidence}
            </div>
          )}
        </div>
      </div>

      {rr.kind === "deterministic" && rr.rationale && (
        <p className="text-xs text-slate-500 mt-1">{rr.rationale}</p>
      )}

      {rr.issues.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-red-700">Issues</div>
          <ul className="list-disc pl-4 text-xs text-red-700 space-y-0.5">
            {rr.issues.map((iss, i) => (
              <li key={i}>{iss}</li>
            ))}
          </ul>
        </div>
      )}

      {rr.notes && rr.notes.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-slate-500">Notes (informational, not scored)</div>
          <ul className="list-disc pl-4 text-xs text-slate-500 space-y-0.5">
            {rr.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {rr.suggestions.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-green-700">Suggestions to address</div>
          <ul className="list-disc pl-4 text-xs text-green-700 space-y-0.5">
            {rr.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onToggle}
        className="mt-2 text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "hide rule instruction" : "show rule instruction"}
      </button>

      {expanded && (
        <div className="mt-2 border-t pt-3 text-sm text-slate-600 space-y-2.5">
          {rr.condition_text && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                Condition
              </div>
              {rr.condition_text}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>
              <span className="text-slate-400">Active for: </span>
              {(rr.applies_to || []).join(", ") || "ALL"}
            </span>
            <span>
              <span className="text-slate-400">Weight: </span>
              {rr.weight}
            </span>
            {rr.is_gate && (
              <span className="text-purple-700">
                <span className="text-slate-400">Gate: </span>
                ≥ {rr.gate_min} (rejects case if score &lt; {rr.gate_min})
              </span>
            )}
          </div>
          {rr.description && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">
                Description
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: mdToHtml(rr.description) }}
              />
            </div>
          )}
          {rr.good_examples && (
            <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2">
              <div className="text-xs font-semibold text-green-700 mb-0.5">Good example</div>
              <div className="text-sm text-green-800">{rr.good_examples}</div>
            </div>
          )}
          {rr.bad_examples && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <div className="text-xs font-semibold text-red-700 mb-0.5">Bad example</div>
              <div className="text-sm text-red-800">{rr.bad_examples}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
