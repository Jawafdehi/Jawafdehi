import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useMounted } from "@/hooks/useMounted";
import { MONO_STACK } from "@/lib/data-quality";

export type RateSeries = {
  /** Data key present on every row. */
  key: string;
  label: string;
  /** hsl(var(--token)) — never a hex literal. */
  color: string;
  /** Dashed = a derived / secondary read. */
  dashed?: boolean;
  width?: number;
};

export type RatePoint = { year: number } & Record<string, number | null>;

/**
 * A percentage-over-time line chart (0–100% y-axis) over Bikram Sambat years —
 * one line per series. Used for the outcome-rate decline (conviction vs acquittal)
 * and the fake-credential vs core-graft decomposition. Dashed series mark the
 * derived read; an optional reference line marks the cumulative court average.
 */
export function RateTrend({
  data,
  series,
  refPct,
  refLabel,
  height = 260,
}: {
  data: RatePoint[];
  series: RateSeries[];
  refPct?: number;
  refLabel?: string;
  height?: number;
}) {
  const mounted = useMounted();
  if (!mounted) return <div className="w-full" style={{ height }} />;

  const ariaLabel = series
    .map(
      (s) =>
        `${s.label}: ${data
          .map((d) => `${d.year} ${Math.round((d[s.key] as number | null) ?? 0)}%`)
          .join(", ")}`,
    )
    .join("; ");

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickFormatter={(y: number) => String(y).slice(2)}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            width={40}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            labelFormatter={(y) => `BS ${y}`}
            formatter={(v) => `${Math.round(v as number)}%`}
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
            itemStyle={{ fontFamily: MONO_STACK }}
          />
          {refPct != null && (
            <ReferenceLine
              y={refPct}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={
                refLabel
                  ? {
                      value: refLabel,
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }
                  : undefined
              }
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.width ?? 2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 4.5 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-4 rounded-sm"
              style={{ backgroundColor: s.color, opacity: s.dashed ? 0.6 : 1 }}
              aria-hidden="true"
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
