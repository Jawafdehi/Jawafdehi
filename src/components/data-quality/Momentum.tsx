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

import type { DocumentedByMonthPoint } from "@/lib/data-quality-mock";
import { MONO_STACK } from "@/lib/data-quality";

/** "2026-07" → "Jul '26" for a compact month tick. */
function shortMonth(iso: string): string {
  const [year, month] = iso.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = Number(month) - 1;
  const name = names[idx] ?? month;
  return `${name} '${year.slice(2)}`;
}

/**
 * "The archive is growing" — cumulative documented cases over time. A single
 * series, so no legend (the title names it); accent hue, soft gradient fill,
 * crosshair tooltip. POC-only, fed from mock insights.
 */
export function Momentum({ points }: { points: DocumentedByMonthPoint[] }) {
  const { t } = useTranslation();
  const data = points.map((p) => ({ ...p, monthLabel: shortMonth(p.month) }));

  return (
    <section>
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.momentum.heading", "The archive keeps growing")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.momentum.description",
          "Documented cases add up month over month as court records and CIAA reports are collected and checked.",
        )}
      </p>

      <div className="mt-6 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.28} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: MONO_STACK }}
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: MONO_STACK }}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            <Tooltip
              formatter={(value: number) => [
                value.toLocaleString(),
                t("dataQuality.momentum.tooltip", "Cases documented (cumulative)"),
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#momentumFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs italic text-muted-foreground">
        {t(
          "dataQuality.momentum.note",
          "Illustrative trend for this preview. A live time series is being wired in.",
        )}
      </p>
    </section>
  );
}
