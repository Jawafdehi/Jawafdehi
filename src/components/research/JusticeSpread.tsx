import { useMounted } from "@/hooks/useMounted";
import { MONO_STACK } from "@/lib/data-quality";
import type { JusticeRow } from "@/data/research-corruption";

const NE_STACK = "'Noto Sans Devanagari', system-ui, -apple-system, sans-serif";

/**
 * A dot plot of full-conviction rate by justice (bench-grain), sorted high → low,
 * dot size ∝ number of decisions, coloured by tendency around the court average.
 * The story is the spread: on the same court, hearing the same prosecutor, benches
 * diverge threefold. Rendered as one inline SVG so the Devanagari names and the
 * dots stay perfectly aligned.
 */
export function JusticeSpread({
  justices,
  avgPct,
  bandLabels,
  avgLabel,
}: {
  justices: JusticeRow[];
  avgPct: number;
  bandLabels: { high: string; mid: string; low: string };
  avgLabel: string;
}) {
  const mounted = useMounted();

  const W = 760;
  const labelW = 148;
  const padTop = 26;
  const padBottom = 12;
  const rowH = 24;
  const x1 = W - 46;
  const trackW = x1 - labelW;
  const H = padTop + justices.length * rowH + padBottom;

  const x = (pct: number) => labelW + (trackW * pct) / 100;
  const bandColor = (pct: number) =>
    pct >= 55 ? "hsl(var(--primary-surface))" : pct <= 37 ? "hsl(var(--accent))" : "hsl(var(--alert))";
  const radius = (dec: number) => Math.max(4, Math.min(11, Math.sqrt(dec) / 2.6));

  const ariaLabel = justices
    .map((j) => `${j.name} ${j.convPct}%`)
    .join(", ");

  if (!mounted) {
    return <div className="w-full" style={{ aspectRatio: `${W} / ${H}` }} />;
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ height: "auto", overflow: "visible" }}
        role="img"
        aria-label={avgLabel + ": " + ariaLabel}
      >
        {/* gridlines + x ticks */}
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              y1={padTop - 6}
              x2={x(t)}
              y2={H - padBottom}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
            <text
              x={x(t)}
              y={padTop - 12}
              textAnchor="middle"
              fontSize={10}
              fontFamily={MONO_STACK}
              fill="hsl(var(--muted-foreground))"
            >
              {t}%
            </text>
          </g>
        ))}

        {/* court-average line */}
        <line
          x1={x(avgPct)}
          y1={padTop - 6}
          x2={x(avgPct)}
          y2={H - padBottom}
          stroke="hsl(var(--accent))"
          strokeWidth={1.4}
          strokeDasharray="4 4"
        />
        <text
          x={x(avgPct)}
          y={H - 1}
          textAnchor="middle"
          fontSize={10}
          fontFamily={MONO_STACK}
          fill="hsl(var(--accent))"
        >
          {avgLabel}
        </text>

        {justices.map((j, i) => {
          const cy = padTop + i * rowH + rowH / 2;
          const cx = x(j.convPct);
          const r = radius(j.decisions);
          return (
            <g key={j.name}>
              <line x1={labelW} y1={cy} x2={cx} y2={cy} stroke="hsl(var(--muted))" strokeWidth={2} />
              <circle cx={cx} cy={cy} r={r} fill={bandColor(j.convPct)} stroke="hsl(var(--background))" strokeWidth={1.5}>
                <title>{`${j.name} — ${j.convPct}% (${j.decisions})`}</title>
              </circle>
              <text
                x={labelW - 10}
                y={cy}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11.5}
                fontFamily={NE_STACK}
                fill="hsl(var(--foreground))"
              >
                {j.name}
              </text>
              <text
                x={cx + r + 5}
                y={cy}
                dominantBaseline="middle"
                fontSize={10.5}
                fontFamily={MONO_STACK}
                fill="hsl(var(--muted-foreground))"
              >
                {Math.round(j.convPct)}%
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--primary-surface))" }} aria-hidden="true" />
          {bandLabels.high}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--alert))" }} aria-hidden="true" />
          {bandLabels.mid}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--accent))" }} aria-hidden="true" />
          {bandLabels.low}
        </span>
      </div>
    </div>
  );
}
