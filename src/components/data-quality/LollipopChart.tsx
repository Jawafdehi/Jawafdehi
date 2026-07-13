export interface LollipopItem {
  label: string;
  count: number;
}

/**
 * A horizontal lollipop chart: one dot-on-a-stem per category, sorted by
 * magnitude. Built with flex/CSS (not recharts) so it is robust on narrow
 * phones — the category label and exact count sit on their own line above the
 * stem, so the value is always readable no matter how small the magnitude is
 * (this data spans ~25,000x, from ~100k down to single digits). The stem+dot is
 * a decorative magnitude cue; a small floor keeps even the tiniest category's
 * dot visible. Single-hue (accent), on-system with no palette additions.
 */
export function LollipopChart({ items }: { items: LollipopItem[] }) {
  const data = [...items].sort((a, b) => b.count - a.count);
  const max = data[0]?.count ?? 0;
  if (data.length === 0) return null;

  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = max > 0 ? (d.count / max) * 100 : 0;
        // Floor the stem so tiny categories still show a short stem + dot
        // instead of collapsing onto the axis.
        const stem = Math.max(pct, 2);
        return (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-foreground">{d.label}</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {d.count.toLocaleString()}
              </span>
            </div>
            <div className="relative mt-1.5 h-2.5" aria-hidden="true">
              <div
                className="absolute top-1/2 h-px -translate-y-1/2 rounded-full bg-accent/40"
                style={{ width: `${stem}%` }}
              />
              <span
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-background"
                style={{ left: `${stem}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
