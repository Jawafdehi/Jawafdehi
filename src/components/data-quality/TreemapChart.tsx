import { ResponsiveContainer, Tooltip, Treemap } from "recharts";

import { MONO_STACK } from "@/lib/data-quality";
import { useMounted } from "@/hooks/useMounted";

export interface TreemapItem {
  label: string;
  count: number;
}

interface TileProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  count?: number;
  value?: number;
  /** Largest count in the set — drives the sequential shade. */
  max: number;
}

/**
 * One treemap tile. Sequential single-hue fill (accent opacity by magnitude,
 * mirroring the heatmap) so the dominant category reads darkest and the tiny
 * tail still gets a visible, labeled rectangle. Labels only render when the
 * tile is big enough; text flips to accent-foreground on dark tiles.
 */
function TreemapTile({ x, y, width, height, depth, name, count, value, max }: TileProps) {
  // recharts renders every node (root at depth 0 + leaves at depth 1); only the
  // leaves carry a real category, so skip the root so it never paints over the
  // gaps between tiles.
  if (depth !== 1 || width == null || height == null || x == null || y == null) {
    return null;
  }
  const size = count ?? value ?? 0;
  const op = max > 0 && size > 0 ? Math.max(size / max, 0.14) : 0;
  const dense = op >= 0.55;
  const showLabel = width > 64 && height > 30;
  const ink = dense ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        style={{
          fill: `hsl(var(--accent) / ${op.toFixed(3)})`,
          stroke: "hsl(var(--background))",
          strokeWidth: 2,
        }}
      />
      {showLabel && (
        <>
          <text x={x + 8} y={y + 20} style={{ fontSize: 12, fontWeight: 600, fill: ink }}>
            {name}
          </text>
          <text
            x={x + 8}
            y={y + 37}
            style={{
              fontSize: 11,
              fontFamily: MONO_STACK,
              fill: dense ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {Number(size).toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
}

/**
 * A part-of-whole treemap: rectangles sized by count, shaded by magnitude.
 * Used for the evidence source/type breakdowns, where one category dominates
 * and a long tail of tiny categories would vanish in a linear bar. Category
 * labels + counts are the accessible read (composed into the aria-label);
 * per-tile hover gives exact values.
 */
export function TreemapChart({
  items,
  tooltipLabel,
}: {
  items: TreemapItem[];
  /** Series name shown in the hover tooltip (e.g. "Materials"). */
  tooltipLabel: string;
}) {
  const data = [...items]
    .sort((a, b) => b.count - a.count)
    .map((d) => ({ name: d.label, count: d.count }));
  const max = data[0]?.count ?? 0;
  const mounted = useMounted();
  const height = 260;

  if (!mounted || data.length === 0) {
    return <div className="w-full" style={{ height }} />;
  }

  const ariaLabel = `${tooltipLabel}: ${data
    .map((d) => `${d.name} ${d.count.toLocaleString()}`)
    .join(", ")}`;

  return (
    <div className="w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="count"
          isAnimationActive={false}
          content={<TreemapTile max={max} />}
        >
          <Tooltip
            formatter={(v: number) => [v.toLocaleString(), tooltipLabel]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              fontSize: 13,
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
