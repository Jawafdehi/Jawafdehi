import type { ReviewListItem, ReviewerInfo } from "@/types/casework";
import { dispositionColor, statusColor, fmtDate, fmtDur, scoreBand } from "@/lib/casework-ui";

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

// One review execution rendered as a compact row: id, time, status/stage,
// reviewers, overall score, disposition, duration. The per-case review page
// lists a case's whole run history with these; clicking selects the run whose
// full breakdown renders below. `selected` highlights the active run.
export function ReviewRow({
  review: r,
  onClick,
  selected = false,
}: {
  review: ReviewListItem;
  onClick: () => void;
  selected?: boolean;
}) {
  const reviewers = reviewerLabels(r.reviewers);
  return (
    <li
      className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer border-l-2 ${
        selected ? "bg-slate-50 border-primary" : "border-transparent hover:bg-slate-50"
      }`}
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
