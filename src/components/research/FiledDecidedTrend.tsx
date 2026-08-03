import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fyLabel } from "@/data/research-corruption";
import { useMounted } from "@/hooks/useMounted";
import { MONO_STACK } from "@/lib/data-quality";

/**
 * Cases filed vs. decided, by fiscal year — the one genuinely temporal view.
 * Two lines (filed = navy, decided = crimson) share one y-axis; the filing peak
 * leads the verdict peak by a few years, a rough visual proxy for pipeline lag.
 *
 * Also reused, with different labels, for the CIAA-reports-vs-court-register
 * cross-check: any two comparable series keyed on fiscal year fit. The `filed` /
 * `decided` prop names are historical — the labels are what the reader sees, and
 * the aria description is built from them.
 */
export function FiledDecidedTrend({
  years,
  filed,
  decided,
  filedLabel,
  decidedLabel,
  overlapping = false,
}: {
  years: readonly number[];
  filed: readonly number[];
  decided: readonly number[];
  filedLabel: string;
  decidedLabel: string;
  /**
   * Set when the two series are expected to very nearly coincide. Drawing them both
   * solid at the same width then renders as ONE line — the second simply covers the
   * first — which reads as a single series and hides the very thing the chart is for.
   * With this on, the first series is drawn wider and dashed so both stay legible and
   * the gaps between them are what the eye picks up.
   */
  overlapping?: boolean;
}) {
  const mounted = useMounted();
  const height = 260;

  const data = years.map((year, i) => ({ year, filed: filed[i], decided: decided[i] }));

  if (!mounted) return <div className="w-full" style={{ height }} />;

  const ariaLabel = `${filedLabel} / ${decidedLabel}: ${data
    .map((d) => `${fyLabel(d.year)} ${d.filed}/${d.decided}`)
    .join(", ")}`;

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickFormatter={(y: number) => fyLabel(y).slice(2)}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            width={36}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            labelFormatter={(y) => `FY ${fyLabel(Number(y))}`}
            contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }}
            itemStyle={{ fontFamily: MONO_STACK }}
          />
          <Line
            type="monotone"
            dataKey="filed"
            name={filedLabel}
            stroke="hsl(var(--primary))"
            strokeWidth={overlapping ? 4 : 2}
            strokeOpacity={overlapping ? 0.45 : 1}
            dot={overlapping ? false : { r: 2.5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="decided"
            name={decidedLabel}
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            strokeDasharray={overlapping ? "5 4" : undefined}
            dot={{ r: 2.5, fill: "hsl(var(--accent))", strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: "hsl(var(--primary))", opacity: overlapping ? 0.45 : 1 }}
            aria-hidden="true"
          />
          {filedLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: "hsl(var(--accent))", opacity: overlapping ? 0.75 : 1 }}
            aria-hidden="true"
          />
          {decidedLabel}
        </span>
      </div>
    </div>
  );
}
