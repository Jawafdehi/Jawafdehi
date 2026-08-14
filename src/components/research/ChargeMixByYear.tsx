import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fyLabel, type ChargeMixYear } from "@/data/research-corruption";
import { useMounted } from "@/hooks/useMounted";
import { MONO_STACK } from "@/lib/data-quality";
import { Switch } from "@/components/ui/switch";

type MixKey = "bribery" | "fake" | "embezzlement" | "benefit" | "loss" | "other";

// Fixed categorical order + colours (validated CVD-safe set; `other` is neutral).
// Fake-credential is crimson so the eye tracks the family whose share collapses.
const SERIES: readonly { key: MixKey; color: string }[] = [
  { key: "bribery", color: "#2a78d6" },
  // The only brand colour in this set, so it reads the token rather than a
  // literal — the other five belong to this palette alone and are not brand.
  { key: "fake", color: "hsl(var(--accent))" },
  { key: "embezzlement", color: "#1baf7a" },
  { key: "benefit", color: "#4a3aa7" },
  { key: "loss", color: "#eda100" },
  { key: "other", color: "hsl(var(--muted-foreground))" },
];

const rowTotal = (d: ChargeMixYear) =>
  d.bribery + d.fake + d.embezzlement + d.benefit + d.loss + d.other;

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
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data as ChargeMixYear[]}
            stackOffset={percent ? "expand" : "none"}
            margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
          >
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="fy"
              tickLine={false}
              axisLine={false}
              tickFormatter={(y: number) => fyLabel(y).slice(2)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              width={36}
              tickLine={false}
              axisLine={false}
              domain={percent ? [0, 1] : undefined}
              tickFormatter={percent ? (v: number) => `${Math.round(v * 100)}%` : undefined}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              labelFormatter={(y) => `FY ${fyLabel(Number(y))}`}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
              itemStyle={{ fontFamily: MONO_STACK }}
              formatter={(value: number, name: string, entry: { payload?: ChargeMixYear }) => {
                if (!percent) return [value, name];
                const total = entry?.payload ? rowTotal(entry.payload) : 0;
                const pct = total ? Math.round((value / total) * 100) : 0;
                return [`${value} (${pct}%)`, name];
              }}
            />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={labels[s.key]}
                stackId="mix"
                fill={s.color}
                stroke="hsl(var(--background))"
                strokeWidth={1}
                radius={!percent && i === SERIES.length - 1 ? [3, 3, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
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
