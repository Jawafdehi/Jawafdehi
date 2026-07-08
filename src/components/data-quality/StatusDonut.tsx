import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { useMounted } from "@/hooks/useMounted";

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * A compact status donut. Real data can be heavily skewed (most cases sit in a
 * single status), so the legend carries exact counts + shares — the ring is the
 * glance, the legend is the read.
 */
export function StatusDonut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const data = segments.filter((s) => s.value > 0);
  const mounted = useMounted();

  if (!mounted) {
    return <div className="relative mx-auto h-[200px] w-full max-w-[240px]" />;
  }

  return (
    <div>
      <div className="relative mx-auto h-[200px] w-full max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name) => [value.toLocaleString(), name]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold tabular-nums text-primary">
            {centerValue}
          </span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto font-mono font-semibold tabular-nums text-foreground">
                {s.value.toLocaleString()}
              </span>
              <span className="w-10 text-right font-mono tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
