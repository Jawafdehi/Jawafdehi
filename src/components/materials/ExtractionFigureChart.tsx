// SPDX-License-Identifier: Hippocratic-3.0
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  chartKind,
  pieIsSafe,
  tooManySeries,
  type PlottedFigure,
} from "@/lib/extraction-figure";

/**
 * One extracted chart, redrawn.
 *
 * Loaded through `lazyChart`, so recharts never enters the material page's
 * chunk — the overwhelming majority of materials have no extraction at all.
 *
 * Only line, bar and pie are drawn. The corpus also contains venn diagrams,
 * radars and bubble charts; approximating those with a shape the source never
 * had would misrepresent the document, so `chartKind` returns null for them and
 * the panel shows the numbers alone.
 *
 * Estimated points — values read off the chart image rather than a printed
 * figure — are marked wherever they appear: a hollow dot on a line, a note
 * above the chart, and the `≈` that the table already carries. A chart whose
 * every value was guessed must not look like one that was read.
 */

const SERIES_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const AXIS = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

const TOOLTIP_STYLE = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 2,
  fontSize: 12,
};

const fmt = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 2 });

type Row = Record<string, string | number | null>;

/** recharts hands the label renderer an untyped bag; name the bits we use. */
interface PieLabel {
  name?: string;
  value?: number;
  percent?: number;
}

/** Wide rows keyed by series name — the shape every recharts chart wants. */
function toRows(figure: PlottedFigure): Row[] {
  return figure.categories.map((category) => {
    const row: Row = { category };
    for (const series of figure.series) {
      const hit = series.points.find((p) => p.category === category);
      row[series.name || "value"] = hit ? hit.value : null;
      // Carried so the dot renderer can mark a guessed point without a lookup.
      row[`${series.name || "value"}__est`] = hit?.estimated ? 1 : 0;
    }
    return row;
  });
}

export interface ExtractionFigureChartProps {
  figure: PlottedFigure;
  chartType: string;
  unit: string;
  title: string;
  height?: number;
}

export default function ExtractionFigureChart({
  figure,
  chartType,
  unit,
  title,
  height = 260,
}: ExtractionFigureChartProps) {
  const kind = chartKind(chartType);
  // Past the palette there is no honest way to tell series apart, and the chart
  // would be unreadable anyway. The panel shows the numbers instead.
  if (!kind || tooManySeries(figure)) return null;

  // The chart is decorative over a table that carries the same numbers, so it
  // is labelled rather than described cell by cell.
  const summary = `${title || "Chart"}${unit ? ` (${unit})` : ""}: ${
    figure.categories.length
  } categories, ${figure.series.length} series. The figures follow in the table.`;

  if (kind === "pie" && pieIsSafe(figure)) {
    const slices = figure.series[0].points.map((p, i) => ({
      name: p.category,
      value: p.value ?? 0,
      est: p.estimated,
      fill: SERIES_COLORS[i % SERIES_COLORS.length],
    }));
    // The ring grows with its slice count so the direct labels have somewhere
    // to sit. These go to sixteen slices; a fixed height crushes them.
    const tall = Math.max(height, 200 + slices.length * 18);
    return (
      <div className="w-full" style={{ height: tall }} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 96, bottom: 8, left: 96 }}>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="38%"
              outerRadius="62%"
              paddingAngle={1}
              isAnimationActive={false}
              // Identity comes from the label, not the hue — which is what makes
              // a sixteen-slice ring legible at all, and what lets the palette
              // repeat past five slices without the reader losing track.
              label={({ name, value, percent }: PieLabel) =>
                `${name} ${fmt(value ?? null)}${
                  percent === undefined ? "" : ` (${Math.round(percent * 100)}%)`
                }`
              }
              labelLine={{ stroke: "hsl(var(--border))" }}
            >
              {slices.map((slice) => (
                <Cell
                  key={slice.name}
                  fill={slice.fill}
                  stroke="hsl(var(--background))"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number, _n: string, item: { payload?: { est?: boolean } }) => [
                `${item?.payload?.est ? "≈ " : ""}${fmt(v)}`,
                unit || "value",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const rows = toRows(figure);
  const names = figure.series.map((s) => s.name || "value");
  const showLegend = figure.series.length > 1;

  const axes = (
    <>
      <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
      <XAxis
        dataKey="category"
        tick={AXIS}
        interval="preserveStartEnd"
        minTickGap={16}
        tickLine={false}
      />
      <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} />
      <Tooltip
        contentStyle={TOOLTIP_STYLE}
        formatter={(v: number, name: string, item: { payload?: Row }) => [
          // The tooltip is where a reader checks one number, so the estimate
          // marker has to be here too, not only in the table.
          `${item?.payload?.[`${name}__est`] ? "≈ " : ""}${fmt(v)}`,
          name || unit || "value",
        ]}
      />
      {showLegend ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
    </>
  );

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "line" ? (
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {axes}
            {names.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls
                dot={(props: {
                  cx?: number;
                  cy?: number;
                  key?: string;
                  payload?: Row;
                }) => {
                  const estimated = Boolean(props.payload?.[`${name}__est`]);
                  const color = SERIES_COLORS[i % SERIES_COLORS.length];
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={estimated ? 3 : 0}
                      // Hollow = read off the image. A solid run and a hollow
                      // run must not look alike.
                      fill="hsl(var(--background))"
                      stroke={estimated ? color : "none"}
                      strokeWidth={1.5}
                    />
                  );
                }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {axes}
            {names.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                isAnimationActive={false}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
