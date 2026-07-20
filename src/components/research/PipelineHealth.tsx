import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useMounted } from "@/hooks/useMounted";
import { MONO_STACK } from "@/lib/data-quality";

export type PipelinePoint = {
  year: number;
  /** Cases from this filing cohort still awaiting a verdict. */
  pending: number;
  /** Median months-to-verdict, complete cohorts only (else null). */
  monthsSolid: number | null;
  /** Median months-to-verdict, still-open cohorts (else null) — provisional. */
  monthsProvisional: number | null;
};

/**
 * Case pace and backlog by Bikram Sambat FILING-year cohort. Bars = cases still
 * awaiting a verdict (backlog, right axis); the line = median months from
 * registration to verdict (left axis). The line is solid only for cohorts that
 * are essentially fully decided; recent cohorts are still being adjudicated, so
 * their median is shown dashed — a low value there means "only the fast cases
 * have landed", not that cases move quickly.
 */
export function PipelineHealth({
  data,
  monthsLabel,
  backlogLabel,
  provisionalLabel,
  height = 280,
}: {
  data: PipelinePoint[];
  monthsLabel: string;
  backlogLabel: string;
  provisionalLabel: string;
  height?: number;
}) {
  const mounted = useMounted();
  if (!mounted) return <div className="w-full" style={{ height }} />;

  const ariaLabel = `${monthsLabel} / ${backlogLabel}: ${data
    .map((d) => `${d.year} ${Math.round((d.monthsSolid ?? d.monthsProvisional) ?? 0)}m, ${d.pending} pending`)
    .join("; ")}`;

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickFormatter={(y: number) => String(y).slice(2)}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            yAxisId="months"
            width={34}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            yAxisId="pending"
            orientation="right"
            width={30}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            labelFormatter={(y) => `BS ${y}`}
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
            itemStyle={{ fontFamily: MONO_STACK }}
          />
          <Bar
            yAxisId="pending"
            dataKey="pending"
            name={backlogLabel}
            fill="hsl(var(--accent))"
            fillOpacity={0.3}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="months"
            type="monotone"
            dataKey="monthsSolid"
            name={monthsLabel}
            stroke="hsl(var(--primary))"
            strokeWidth={2.25}
            dot={{ r: 2.5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            yAxisId="months"
            type="monotone"
            dataKey="monthsProvisional"
            name={provisionalLabel}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.55}
            dot={{ r: 2, fill: "hsl(var(--primary))", strokeWidth: 0, fillOpacity: 0.55 }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: "hsl(var(--primary))" }} aria-hidden="true" />
          {monthsLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-sm border-t-2 border-dashed"
            style={{ borderColor: "hsl(var(--primary))", opacity: 0.6 }}
            aria-hidden="true"
          />
          {provisionalLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: "hsl(var(--accent))", opacity: 0.3 }}
            aria-hidden="true"
          />
          {backlogLabel}
        </span>
      </div>
    </div>
  );
}
