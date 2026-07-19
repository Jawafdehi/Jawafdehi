import { useMounted } from "@/hooks/useMounted";
import { outcomePct, type OutcomeCounts } from "@/data/research-corruption";

export interface ChargeRow extends OutcomeCounts {
  /** Display label (already resolved to the active language). */
  label: string;
  /** Secondary label (e.g. the Nepali/English counterpart), shown small. */
  sublabel?: string;
}

/**
 * One 100%-stacked bar per charge type — convicted / partial / acquitted — sorted
 * by conviction rate, with the court-wide average drawn as a dashed reference line.
 * The point is the spread: fake-credential cases convict at ~88% while the signature
 * financial-graft charges mostly end in acquittal. Percentages are labelled directly
 * on each segment (the honest, colour-independent read).
 */
export function ConvictionByCharge({
  rows,
  avgPct,
  seriesLabels,
  avgLabel,
}: {
  rows: ChargeRow[];
  /** Court-wide full-conviction rate, drawn as the reference line (e.g. 46). */
  avgPct: number;
  seriesLabels: { convicted: string; partial: string; acquitted: string };
  avgLabel: string;
}) {
  const mounted = useMounted();

  const segs = [
    { key: "convicted" as const, color: "hsl(var(--primary))", text: "hsl(var(--primary-foreground))" },
    { key: "partial" as const, color: "hsl(var(--alert))", text: "hsl(var(--foreground))" },
    { key: "acquitted" as const, color: "hsl(var(--accent))", text: "hsl(var(--accent-foreground))" },
  ];

  const ariaLabel = rows
    .map((r) => `${r.label}: ${Math.round(outcomePct(r, "convicted"))}% convicted`)
    .join("; ");

  if (!mounted) {
    return <div className="w-full" style={{ height: rows.length * 48 + 16 }} />;
  }

  return (
    <div role="img" aria-label={ariaLabel}>
      <ul className="space-y-3">
        {rows.map((row) => {
          const convPct = outcomePct(row, "convicted");
          return (
            <li
              key={row.label}
              className="grid grid-cols-[8.5rem_1fr_2.75rem] items-center gap-3 sm:grid-cols-[12rem_1fr_2.75rem]"
            >
              <div className="min-w-0 text-right leading-tight">
                <div className="truncate text-[13px] font-medium text-foreground">{row.label}</div>
                {row.sublabel && (
                  <div className="truncate text-[11px] text-muted-foreground">{row.sublabel}</div>
                )}
              </div>

              {/* Track */}
              <div className="relative h-7 overflow-hidden rounded-md bg-muted">
                <div className="flex h-full w-full">
                  {segs.map((seg, i) => {
                    const pct = outcomePct(row, seg.key);
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={seg.key}
                        className="flex items-center justify-center"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: seg.color,
                          boxShadow: i < segs.length - 1 ? "inset -2px 0 0 hsl(var(--background))" : undefined,
                        }}
                      >
                        {pct >= 11 && (
                          <span
                            className="font-mono text-[11px] font-semibold tabular-nums"
                            style={{ color: seg.text }}
                          >
                            {Math.round(pct)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Court-average reference line */}
                <div
                  className="pointer-events-none absolute inset-y-0 border-l border-dashed border-foreground/40"
                  style={{ left: `${avgPct}%` }}
                  aria-hidden="true"
                />
              </div>

              <span className="text-right font-mono text-[13px] font-bold tabular-nums text-foreground">
                {Math.round(convPct)}%
              </span>
            </li>
          );
        })}
      </ul>

      {/* Legend + reference caption */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {segs.map((seg) => (
          <span key={seg.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: seg.color }} aria-hidden="true" />
            {seriesLabels[seg.key]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0 border-l border-dashed border-foreground/50" aria-hidden="true" />
          {avgLabel}
        </span>
      </div>
    </div>
  );
}
