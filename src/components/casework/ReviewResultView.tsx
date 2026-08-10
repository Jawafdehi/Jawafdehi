import { useEffect, useMemo, useState } from "react";
import type { ReviewDetail, RuleResult, SourceSummary } from "@/types/casework";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  dispositionColor,
  statusColor,
  fmtDate,
  fmtDur,
  scoreBand,
  radarChartSvg,
  mdToHtml,
} from "@/lib/casework-ui";
import { Loader2, ChevronDown, FileText } from "lucide-react";

type Filter = "all" | "needs" | "llm" | "deterministic" | "gates";

function needsAddressing(rr: RuleResult, passT: number): boolean {
  return rr.gate_failed || rr.issues.length > 0 || rr.suggestions.length > 0 || rr.score < passT;
}

// Presentational full breakdown for ONE review run: hero (score / disposition /
// radar / narrative), sources (+ viewer modal), and the per-rule cards with
// category filters. Given a fully-loaded ReviewDetail; owns only local UI state
// (active filter, expanded rules, open source). Data loading / polling / the
// "run a review" action are the caller's concern (the per-case page).
export function ReviewResultView({ review }: { review: ReviewDetail }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [source, setSource] = useState<SourceSummary | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Close the source viewer on Escape (keyboard a11y).
  useEffect(() => {
    if (!source) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSource(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [source]);

  const result = review.result || null;
  const passT = result?.thresholds?.pass ?? 80;
  const inProgress = review.status === "pending" || review.status === "running";

  // Elapsed is the time actually spent running the review: finished − picked up.
  // Fall back to the worker-measured duration for older rows that predate the
  // pickup-time stamp (started_at null).
  const elapsedSeconds =
    review.started_at && review.completed_at
      ? (new Date(review.completed_at).getTime() - new Date(review.started_at).getTime()) / 1000
      : review.duration_seconds;

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

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-mono text-muted-foreground">run #{review.id}</span>
              <span className={`px-2 py-0.5 rounded-full border ${statusColor(review.status)}`}>
                {inProgress ? review.stage || review.status : review.status}
              </span>
              {review.case_type && (
                <span className="px-2 py-0.5 rounded-full border bg-muted text-foreground border-border">
                  {result?.case_type?.label || review.case_type}
                </span>
              )}
              <span className="text-muted-foreground" title="Submitted for review">
                🕓 {fmtDate(review.created_at)}
              </span>
              {review.started_at && (
                <span className="text-muted-foreground" title="Picked up by a worker">
                  🚀 {fmtDate(review.started_at)}
                </span>
              )}
              {review.completed_at && (
                <span className="text-muted-foreground" title="Finished">
                  🏁 {fmtDate(review.completed_at)}
                </span>
              )}
              {elapsedSeconds != null && (
                <span className="text-muted-foreground" title="Elapsed (finished − picked up)">
                  ⏱ {fmtDur(elapsedSeconds)}
                </span>
              )}
              <span className="text-muted-foreground">
                sources {review.sources_converted}/{review.source_count}
              </span>
              {review.reviewers && review.reviewers.length > 0 && (
                <span
                  className="text-muted-foreground font-mono"
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
          {result && (
            <div className="text-right shrink-0">
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
        </div>

        {inProgress && (
          <div className="mt-4 flex items-center gap-2 text-sm text-info bg-info/10 border border-info/25 rounded px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Review in progress — stage: {review.stage || review.status}. This page refreshes
            automatically.
          </div>
        )}

        {review.status === "failed" && review.error && (
          <pre className="mt-4 text-xs text-danger bg-danger/10 border border-danger/25 rounded p-3 whitespace-pre-wrap max-h-48 overflow-auto">
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
          <p className="mt-3 text-sm text-foreground italic border-l-2 border-border pl-3">
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
              const ok = s.conversion_status === "converted" || s.conversion_status === "attached";
              return (
                <li key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-meta rounded border px-1.5 py-0.5 ${
                        ok
                          ? "bg-success-strong/10 text-success-strong border-success-strong/25"
                          : "bg-alert-strong/10 text-alert-strong border-alert-strong/25"
                      }`}
                    >
                      {s.conversion_status}
                    </span>
                    <span className="flex-1 truncate" title={s.title}>
                      {s.title || "(untitled)"}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.markdown_chars} chars</span>
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
                    <p className="mt-0.5 ml-1 text-xs text-alert-strong break-words">
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
                aria-pressed={filter === f}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  filter === f
                    ? "bg-primary-surface text-primary-foreground border-primary"
                    : "bg-white text-foreground border-border hover:bg-muted"
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
                      <span className="text-xs font-bold" style={{ color: scoreBand(catScore) }}>
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
                        onToggle={() => setExpanded((e) => ({ ...e, [rr.key]: !e[rr.key] }))}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Source viewer — shared Dialog primitive: focus trap, Escape-to-close,
          and overlay semantics come for free. */}
      <Dialog open={!!source} onOpenChange={(open) => !open && setSource(null)}>
        {source && (
          <DialogContent className="max-w-3xl w-full max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
            {/* pr-12 leaves room for the Dialog's built-in close (X) button. */}
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3 pr-12">
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold truncate">{source.title}</DialogTitle>
                <div className="text-xs text-muted-foreground">{source.source_type}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? "Rendered" : "Raw"}
              </Button>
            </div>
            <div className="p-4 overflow-auto text-sm">
              {!(source.conversion_status === "converted" || source.conversion_status === "attached") &&
              source.conversion_note ? (
                // No converted text — show WHY (e.g. "Conversion failed: ...").
                <p className="text-alert-strong break-words">⚠ {source.conversion_note}</p>
              ) : showRaw ? (
                <pre className="whitespace-pre-wrap text-xs">{source.markdown || "(no markdown)"}</pre>
              ) : (
                <div
                  className="font-paragraph content-prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: mdToHtml(source.markdown || "_(no markdown)_") }}
                />
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
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
    <div className={`border rounded-lg p-3 ${rr.gate_failed ? "border-danger/25 bg-danger/40" : "bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{rr.title}</span>
            <span className="font-meta rounded border border-border bg-muted px-1.5 py-0.5 text-muted-foreground">
              {rr.kind}
            </span>
            {rr.is_gate && (
              <span className="font-meta rounded border border-tone-violet/25 bg-tone-violet/10 px-1.5 py-0.5 text-tone-violet">
                gate ≥ {rr.gate_min}
              </span>
            )}
            {rr.gate_failed && (
              <span className="font-meta rounded border border-danger/25 bg-danger/10 px-1.5 py-0.5 text-danger">
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
            <div className="font-meta text-muted-foreground">
              μ{rr.score} · σ{rr.std} · {rr.confidence}
            </div>
          )}
        </div>
      </div>

      {rr.kind === "deterministic" && rr.rationale && (
        <p className="text-xs text-muted-foreground mt-1">{rr.rationale}</p>
      )}

      {rr.issues.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-danger">Issues</div>
          <ul className="list-disc pl-4 text-xs text-danger space-y-0.5">
            {rr.issues.map((iss, i) => (
              <li key={i}>{iss}</li>
            ))}
          </ul>
        </div>
      )}

      {rr.notes && rr.notes.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-muted-foreground">Notes (informational, not scored)</div>
          <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
            {rr.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {rr.suggestions.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-success-strong">Suggestions to address</div>
          <ul className="list-disc pl-4 text-xs text-success-strong space-y-0.5">
            {rr.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="font-meta mt-2 flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "hide rule instruction" : "show rule instruction"}
      </button>

      {expanded && (
        <div className="mt-2 border-t pt-3 text-sm text-foreground space-y-2.5">
          {rr.condition_text && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                Condition
              </div>
              {rr.condition_text}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>
              <span className="text-muted-foreground">Active for: </span>
              {(rr.applies_to || []).join(", ") || "ALL"}
            </span>
            <span>
              <span className="text-muted-foreground">Weight: </span>
              {rr.weight}
            </span>
            {rr.is_gate && (
              <span className="text-tone-violet">
                <span className="text-muted-foreground">Gate: </span>
                ≥ {rr.gate_min} (rejects case if score &lt; {rr.gate_min})
              </span>
            )}
          </div>
          {rr.description && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                Description
              </div>
              <div
                className="font-paragraph content-prose max-w-none"
                dangerouslySetInnerHTML={{ __html: mdToHtml(rr.description) }}
              />
            </div>
          )}
          {rr.good_examples && (
            <div className="rounded-md bg-success-strong/10 border border-success-strong/25 px-3 py-2">
              <div className="text-xs font-semibold text-success-strong mb-0.5">Good example</div>
              <div className="text-sm text-success-strong">{rr.good_examples}</div>
            </div>
          )}
          {rr.bad_examples && (
            <div className="rounded-md bg-danger/10 border border-danger/25 px-3 py-2">
              <div className="text-xs font-semibold text-danger mb-0.5">Bad example</div>
              <div className="text-sm text-danger">{rr.bad_examples}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
