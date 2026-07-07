import { Skeleton } from "@/components/ui/skeleton";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** CSS color for the bar fill (a theme token via `hsl(var(--…))`). */
  color: string;
}

/**
 * A drop-off funnel: each stage is a full-width track with a proportional fill,
 * so the collapse from "documented" to "published" is visible at a glance. The
 * count sits OUTSIDE the bar (right-aligned) so even a 1%-wide sliver stays
 * readable — the whole point is that the last stage is almost nothing.
 *
 * Bars are scaled against the first stage (the widest), which is the honest
 * denominator for "% that make it this far".
 */
export function AccountabilityFunnel({
  stages,
  isLoading,
  ofLabel,
}: {
  stages: FunnelStage[];
  isLoading: boolean;
  /** Formatter for the "{pct}% of documented" caption per row. */
  ofLabel: (pct: string) => string;
}) {
  const denominator = stages[0]?.count || 1;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {stages.map((s) => (
          <Skeleton key={s.key} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {stages.map((stage) => {
        const share = (stage.count / denominator) * 100;
        // Keep a hairline of fill even at ~0% so the row never looks empty.
        const width = stage.count === 0 ? 0 : Math.max(share, 0.8);
        const pctLabel = share >= 10 ? Math.round(share).toString() : share.toFixed(1);

        return (
          <li key={stage.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{stage.label}</span>
              <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                {stage.count.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${width}%`, backgroundColor: stage.color }}
                />
              </div>
              <span className="w-28 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                {ofLabel(pctLabel)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
