import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DataLakeMetrics } from "@/types/jds";
import { useMounted } from "@/hooks/useMounted";
import { bsYearRows, bsYearWithAd } from "@/lib/data-quality";

/** Compact axis ticks: 140000 -> "140k", 1500000 -> "1.5M". */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * Court-case volume over time — the one genuinely temporal series on the page,
 * so it gets the one area chart. A single accent series (fill = accent opacity
 * gradient, 2px line) over Bikram Sambat registration years in ascending order.
 * Ticks are bare BS years (the section heading names the calendar); the tooltip
 * spells it out and adds the Gregorian span. Renders nothing until ngm.by_year
 * is present.
 */
export function CourtYearTrend({ ngm }: { ngm?: DataLakeMetrics }) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const byYear = bsYearRows(ngm?.by_year);
  const height = 200;

  if (!byYear.length) return null;

  const data = [...byYear].sort((a, b) => a.bs_year - b.bs_year);

  if (!mounted) {
    return <div className="w-full" style={{ height }} />;
  }

  const ariaLabel = `${t("dataQuality.courtCases.trendTooltip", "Court cases")}: ${data
    .map((d) => `${bsYearWithAd(d.bs_year, t)} ${d.count.toLocaleString()}`)
    .join(", ")}`;

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="courtTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.28} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="bs_year"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatCompact}
          />
          <Tooltip
            formatter={(v: number) => [
              v.toLocaleString(),
              t("dataQuality.courtCases.trendTooltip", "Court cases"),
            ]}
            labelFormatter={(label) => bsYearWithAd(Number(label), t)}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              fontSize: 13,
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            fill="url(#courtTrendFill)"
            isAnimationActive={false}
            dot={{ r: 3, fill: "hsl(var(--accent))", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
