import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthFiling } from "@/data/research-corruption";
import { useMounted } from "@/hooks/useMounted";
import { MONO_STACK } from "@/lib/data-quality";

/**
 * Cases filed per Nepali month — mean bar with ±1 SD error bars across complete
 * fiscal years. Surfaces the filing seasonality: a peak in Ashadh (the
 * fiscal year-end) and a trough in Kartik (the Dashain/Tihar festival month).
 * The tall error bars are themselves the point — filing volume swings widely
 * year to year.
 */
export function FiledByMonth({
  data,
  peakMonth,
  meanLabel,
  sdLabel,
}: {
  data: readonly MonthFiling[];
  /** Month index (1–12) to accent; e.g. the fiscal year-end peak. */
  peakMonth?: number;
  meanLabel: string;
  sdLabel: string;
}) {
  const mounted = useMounted();
  const height = 300;
  // Pin the axis to [0, nice-max]: filings can't be negative, so a large SD
  // (e.g. Kartik mean 11.2 ± 11.3) must not push the auto-domain below zero;
  // the max still clears every upper whisker (mean + sd).
  const maxY = Math.ceil(Math.max(...data.map((d) => d.mean + d.sd)) / 10) * 10;

  if (!mounted) return <div className="w-full" style={{ height }} />;

  const ariaLabel = `${meanLabel} by Nepali month, with ${sdLabel}: ${data
    .map((d) => `${d.name} ${d.mean} ±${d.sd}`)
    .join(", ")}`;

  return (
    <div className="w-full" role="img" aria-label={ariaLabel}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data as MonthFiling[]} margin={{ top: 8, right: 12, bottom: 22, left: 4 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="name"
              interval={0}
              tickLine={false}
              axisLine={false}
              angle={-35}
              textAnchor="end"
              height={44}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              width={36}
              domain={[0, maxY]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
              itemStyle={{ fontFamily: MONO_STACK }}
              formatter={(value: number, _n, entry: { payload?: MonthFiling }) => [
                `${value} ± ${entry?.payload?.sd ?? 0}`,
                meanLabel,
              ]}
            />
            <Bar dataKey="mean" name={meanLabel} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                // Lighter blue than navy so the dark error whiskers stay legible
                // against the fill; the fiscal year-end peak is accented in crimson.
                <Cell key={d.month} fill={peakMonth === d.month ? "hsl(var(--accent))" : "#2a78d6"} />
              ))}
              <ErrorBar
                dataKey="sd"
                width={7}
                strokeWidth={2}
                stroke="hsl(var(--foreground))"
                direction="y"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
