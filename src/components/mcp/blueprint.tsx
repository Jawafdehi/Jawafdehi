/**
 * The technical-drawing backdrop behind /mcp: a fine grid, hatched margins
 * outside the content column, and crosshair ticks where the margins meet.
 *
 * Everything is drawn from `--foreground` at low alpha, so it inverts with the
 * theme instead of needing a second dark-mode variant. Purely decorative, so
 * the whole thing is aria-hidden and non-interactive.
 */
export function BlueprintBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Fine grid across the whole band. */}
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,hsl(var(--foreground)/0.055)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.055)_1px,transparent_1px)] [background-size:48px_48px]" />

      {/* Hatched margins, drawn only on viewports wide enough to have margins. */}
      <div className="absolute inset-y-0 left-0 hidden w-[max(0px,calc((100%-var(--blueprint-column))/2))] [background-image:repeating-linear-gradient(135deg,hsl(var(--foreground)/0.05)_0,hsl(var(--foreground)/0.05)_1px,transparent_1px,transparent_7px)] lg:block" />
      <div className="absolute inset-y-0 right-0 hidden w-[max(0px,calc((100%-var(--blueprint-column))/2))] [background-image:repeating-linear-gradient(135deg,hsl(var(--foreground)/0.05)_0,hsl(var(--foreground)/0.05)_1px,transparent_1px,transparent_7px)] lg:block" />

      {/* The two rules bounding the content column, plus corner ticks. */}
      <div className="absolute inset-y-0 left-1/2 hidden w-[var(--blueprint-column)] -translate-x-1/2 border-x border-foreground/[0.07] lg:block">
        <span className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 border border-foreground/20" />
        <span className="absolute -right-[3px] -top-[3px] h-1.5 w-1.5 border border-foreground/20" />
        <span className="absolute -bottom-[3px] -left-[3px] h-1.5 w-1.5 border border-foreground/20" />
        <span className="absolute -bottom-[3px] -right-[3px] h-1.5 w-1.5 border border-foreground/20" />
      </div>
    </div>
  );
}
