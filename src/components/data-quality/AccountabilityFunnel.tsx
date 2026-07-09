import { Skeleton } from "@/components/ui/skeleton";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** CSS color for the bar fill (a theme token via `hsl(var(--…))`). */
  color: string;
}

/**
 * A part-to-whole status breakdown. Each row is a mutually-exclusive bucket of
 * the documented total (under investigation / published / closed), drawn as a
 * full-width track with a proportional fill so the collapse to "published" is
 * visible at a glance. The count sits OUTSIDE the bar (right-aligned) so even a
 * 1%-wide sliver stays readable — the whole point is that published is almost
 * nothing.
 *
 * Bars are scaled against `denominator` (the documented total — the parent of
 * these buckets, NOT one of the rows), which is the honest base for "% of all
 * documented cases". The buckets sum back up to the denominator; it is shown
 * separately as a header, never as a competing bar.
 */
export function AccountabilityFunnel({
  stages,
  denominator,
  isLoading,
  ofLabel,
}: {
  stages: FunnelStage[];
  /** The documented total these buckets divide up. Defaults to the largest row. */
  denominator?: number;
  isLoading: boolean;
  /** Formatter for the "{pct}% of documented" caption per row. */
  ofLabel: (pct: string) => string;
}) {
  const base = (denominator ?? stages[0]?.count) || 1;

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
        const share = (stage.count / base) * 100;
        // Keep a hairline of fill even at ~0% so the row never looks empty.
        const width = stage.count === 0 ? 0 : Math.max(share, 0.8);
        // Never let a rounded share read as a clean 100% unless it truly is
        // 100% — same honesty rule as DataHonesty's truncated completeness.
        const rounded = Math.round(share);
        const pctLabel =
          share >= 10
            ? (rounded >= 100 && share < 100 ? 99 : rounded).toString()
            : share.toFixed(1);

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
