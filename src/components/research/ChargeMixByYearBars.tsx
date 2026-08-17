// SPDX-License-Identifier: Hippocratic-3.0
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
import { MONO_STACK } from "@/lib/data-quality";
import { SERIES, rowTotal, type MixKey } from "./charge-mix-series";

/**
 * The recharts body of ChargeMixByYear, in its own chunk.
 *
 * This is split out rather than the whole chart being lazily loaded because the
 * wrapper renders real content before mount: the percent toggle, the colour
 * legend, and — most importantly — a `role="img"` element whose `aria-label`
 * spells out every year's figures as text. Lazily loading the wrapper would drop
 * all of that from the pre-rendered HTML, so only this subtree moves.
 *
 * See src/components/charts/lazy.tsx for the measurement that motivates it.
 */
export function ChargeMixByYearBars({
  data,
  labels,
  percent,
}: {
  data: readonly ChargeMixYear[];
  labels: Record<MixKey, string>;
  percent: boolean;
}) {
  return (
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
  );
}
