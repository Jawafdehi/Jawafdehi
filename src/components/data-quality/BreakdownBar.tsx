import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MONO_STACK } from "@/lib/data-quality";
import { useMounted } from "@/hooks/useMounted";

export interface BreakdownItem {
  label: string;
  count: number;
}

/**
 * A horizontal magnitude bar: one accent hue (bar length is the whole encoding),
 * category labels down the left, counts in the register mono at each bar end.
 * Shared by the entity-type and materials-by-source breakdowns so both read as
 * one chart family.
 */
export function BreakdownBar({
  items,
  tooltipLabel,
  labelWidth = 210,
}: {
  items: BreakdownItem[];
  /** Series name shown in the hover tooltip (e.g. "Entities", "Materials"). */
  tooltipLabel: string;
  labelWidth?: number;
}) {
  const data = [...items].sort((a, b) => b.count - a.count);
  const max = data[0]?.count ?? 0;
  const mounted = useMounted();
  const height = data.length * 44 + 24;

  if (!mounted) {
    return <div className="w-full" style={{ height }} />;
  }

  const ariaLabel = `${tooltipLabel}: ${data
    .map((d) => `${d.label} ${d.count.toLocaleString()}`)
    .join(", ")}`;

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.4 }}
            formatter={(value: number) => [value.toLocaleString(), tooltipLabel]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              fontSize: 13,
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.label} fill="hsl(var(--accent))" />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(v: number) => v.toLocaleString()}
              style={{
                fontSize: 12,
                fontWeight: 600,
                fill: "hsl(var(--foreground))",
                fontFamily: MONO_STACK,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
