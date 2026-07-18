import { useNavigate } from "react-router-dom";
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
import { useIsNarrow } from "@/hooks/useIsNarrow";

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
  hrefFor,
}: {
  items: BreakdownItem[];
  /** Series name shown in the hover tooltip (e.g. "Entities", "Materials"). */
  tooltipLabel: string;
  labelWidth?: number;
  /**
   * Optional per-item drill-down link. When it returns a URL for an item, that
   * bar becomes clickable and navigates there; rows with no URL stay static.
   * Click is a progressive enhancement — callers keep an accessible text link
   * (or the page search) as the real path to the same data.
   */
  hrefFor?: (item: BreakdownItem) => string | undefined;
}) {
  const navigate = useNavigate();
  const data = [...items].sort((a, b) => b.count - a.count);
  const max = data[0]?.count ?? 0;
  const mounted = useMounted();
  const narrow = useIsNarrow();
  const anyClickable = hrefFor ? data.some((d) => Boolean(hrefFor(d))) : false;
  const height = data.length * 44 + 24;

  // On phones the fixed label gutter eats most of a ~375px container, crushing
  // every bar into a thin strip on the right. Shrink the gutter and the tick
  // size below the breakpoint so the bars keep real width.
  const effectiveLabelWidth = narrow ? Math.min(labelWidth, 96) : labelWidth;
  const tickFontSize = narrow ? 11 : 12;

  // The right margin has to reserve room for the widest end-label, or recharts
  // paints it past the SVG edge and it gets clipped mid-number ("11,399" -> "11,39").
  // A fixed 40px was too tight on phones once counts reached six digits, so size
  // it off the actual data: monospace digits run ~0.62em, plus the gap LabelList
  // leaves between the bar end and its label.
  const END_LABEL_FONT_SIZE = 12;
  const widestLabelChars = Math.max(
    ...data.map((d) => d.count.toLocaleString().length),
    1,
  );
  const rightMargin = Math.max(
    Math.ceil(widestLabelChars * END_LABEL_FONT_SIZE * 0.62) + 12,
    narrow ? 40 : 64,
  );

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
          margin={{ top: 4, right: rightMargin, bottom: 4, left: 8 }}
          barCategoryGap={10}
        >
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={effectiveLabelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: tickFontSize, fill: "hsl(var(--foreground))" }}
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
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            isAnimationActive={false}
            onClick={
              anyClickable
                ? (payload: { payload?: BreakdownItem }) => {
                    const item = payload?.payload;
                    const href = item && hrefFor?.(item);
                    if (href) navigate(href);
                  }
                : undefined
            }
          >
            {data.map((entry) => {
              const clickable = Boolean(hrefFor?.(entry));
              return (
                <Cell
                  key={entry.label}
                  fill="hsl(var(--accent))"
                  style={{ cursor: clickable ? "pointer" : "default" }}
                />
              );
            })}
            <LabelList
              dataKey="count"
              position="right"
              formatter={(v: number) => v.toLocaleString()}
              style={{
                fontSize: END_LABEL_FONT_SIZE,
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
