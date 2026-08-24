import { Skeleton } from "@/components/ui/skeleton";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /**
   * Optional upper bound. When set, this stage is a RANGE: the readout becomes
   * "count–countUpper", the share caption spans both ends, and the bar draws the
   * band as a translucent extension beyond the solid `count` fill. Use it where
   * two defensible definitions give two different numbers and picking one would
   * hide the choice. Omitted → the stage renders as a single measured value.
   */
  countUpper?: number;
  /** CSS color for the bar fill (a theme token via `hsl(var(--…))`). */
  color: string;
  /**
   * Optional drop indicator rendered ABOVE this stage (a ↓ chip between it and
   * the previous stage), e.g. "≈1 in 7 investigated are prosecuted". Expresses
   * this stage's share of the *previous* stage — the funnel retention a single
   * "% of total" denominator can't show. Omitted → no indicator rendered.
   */
  note?: string;
}

/**
 * One end of a share readout. Under 10% keeps a decimal, because that is where the funnel
 * lives and "0%" would be a lie; at or above it rounds. Never lets a rounded share read as a
 * clean 100% unless it truly is 100% — the same honesty rule as DataHonesty's truncated
 * completeness.
 */
function fmtShare(share: number): string {
  if (share < 10) return share.toFixed(1);
  const rounded = Math.round(share);
  return (rounded >= 100 && share < 100 ? 99 : rounded).toString();
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
  // A range readout ("62–84", "0.2–0.3% of complaints") needs a wider caption column than a
  // single figure, but only widen when one is actually present so the other caller is untouched.
  const hasRange = stages.some((s) => s.countUpper != null);

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
        const upperShare = stage.countUpper != null ? (stage.countUpper / base) * 100 : null;
        // Same hairline clamp, so the band can never draw NARROWER than the solid fill it
        // extends. At the bottom of a steep funnel both ends clamp to the same sliver and the
        // band is invisible — that is intended. The numeric readout carries the range there;
        // widening the bar to make the spread legible would misstate the share.
        const upperWidth = upperShare == null ? null : Math.max(upperShare, 0.8);
        const pctLabel =
          upperShare == null ? fmtShare(share) : `${fmtShare(share)}–${fmtShare(upperShare)}`;
        const countLabel =
          stage.countUpper == null
            ? stage.count.toLocaleString()
            : `${stage.count.toLocaleString()}–${stage.countUpper.toLocaleString()}`;

        return (
          <li key={stage.key}>
            {stage.note ? (
              <div className="mb-1.5 flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                <svg viewBox="0 0 12 14" className="h-3.5 w-3 shrink-0 text-accent" aria-hidden="true">
                  <path d="M6 0v10M2.5 7L6 11l3.5-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="rounded-full bg-muted px-2 py-0.5">{stage.note}</span>
              </div>
            ) : null}
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{stage.label}</span>
              <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                {countLabel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted">
                {upperWidth == null ? null : (
                  <div
                    className="absolute inset-y-0 left-0 rounded-full opacity-40 transition-[width] duration-700 ease-out"
                    style={{ width: `${upperWidth}%`, backgroundColor: stage.color }}
                  />
                )}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${width}%`, backgroundColor: stage.color }}
                />
              </div>
              <span
                className={`${hasRange ? "w-40" : "w-28"} shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground`}
              >
                {ofLabel(pctLabel)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
