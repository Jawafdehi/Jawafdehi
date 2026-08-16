import { lazy, Suspense, useId, useState } from "react";

import { fyLabel, type ChargeMixYear } from "@/data/research-corruption";
import { useMounted } from "@/hooks/useMounted";
import { Switch } from "@/components/ui/switch";
import { SERIES, type MixKey } from "./charge-mix-series";

// Only the recharts subtree is deferred; everything this component renders
// before mount — the toggle, the legend, and the data-bearing aria-label — stays
// eager, so the pre-rendered HTML is unchanged. See ChargeMixByYearBars.tsx.
const ChargeMixByYearBars = lazy(() =>
  import("./ChargeMixByYearBars").then((m) => ({ default: m.ChargeMixByYearBars })),
);

/**
 * Charge mix by fiscal filing year — a stacked bar per year over the
 * substantive prosecution corpus. Reads as both volume (bar height) and
 * composition (segments): the crimson fake-credential band dominates the early
 * years and thins sharply after FY2077/78 (with a rebound in FY2080/81). A
 * toggle switches to a 100%-share view
 * (equal-height bars) to isolate the composition shift from the volume swings;
 * it is off by default, so absolute case counts show first.
 */
export function ChargeMixByYear({
  data,
  labels,
  percentLabel,
}: {
  data: readonly ChargeMixYear[];
  labels: Record<MixKey, string>;
  percentLabel: string;
}) {
  const mounted = useMounted();
  const [percent, setPercent] = useState(false);
  const toggleId = useId();
  const height = 300;

  const ariaLabel = `Charge mix by fiscal filing year: ${data
    .map((d) => `FY ${fyLabel(d.fy)} — ${SERIES.map((s) => `${labels[s.key]} ${d[s.key]}`).join(", ")}`)
    .join("; ")}`;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-end gap-2">
        <label htmlFor={toggleId} className="text-xs font-medium text-muted-foreground">
          {percentLabel}
        </label>
        <Switch id={toggleId} checked={percent} onCheckedChange={setPercent} />
      </div>

      <div role="img" aria-label={ariaLabel} style={{ height }}>
        {mounted ? (
          <Suspense fallback={null}>
            <ChargeMixByYearBars data={data} labels={labels} percent={percent} />
          </Suspense>
        ) : null}
      </div>

      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {labels[s.key]}
          </li>
        ))}
      </ul>
    </div>
  );
}
