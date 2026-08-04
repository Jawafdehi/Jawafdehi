export type AccountabilityStage = {
  key: string;
  /** Which institution owns this stage, e.g. "CIAA" or "Special Court". */
  owner: string;
  title: string;
  body: string;
  /**
   * The stage exists but no source records its outcome, so it cannot be measured at all.
   * Drawn hollow with a dashed rail, because "we found nothing here" and "nothing is
   * published here" are different claims and the chart should not blur them.
   */
  dark?: boolean;
};

/**
 * The accountability pipeline as an ordered walk, not a list of findings: a complaint
 * enters at the top and either drops out or reaches the next stage. A vertical rail
 * carries the reader down it — vertical rather than horizontal because each stage needs a
 * few sentences to be honest, and horizontal steps would truncate them.
 *
 * The last stages are `dark`: the rail goes dashed and the node hollow at the exact point
 * the public record stops, which is the section's argument.
 */
export function AccountabilityStages({
  stages,
  darkLabel,
}: {
  stages: AccountabilityStage[];
  /** Badge on unmeasurable stages, e.g. "Not measurable". */
  darkLabel: string;
}) {
  return (
    <ol className="relative space-y-0" aria-label={stages.map((s) => s.title).join(" → ")}>
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        // A segment is dashed when the stage it leads INTO is dark, so the rail changes
        // character at the boundary where the record stops rather than one stage late.
        const nextDark = !last && stages[i + 1].dark;
        return (
          <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Rail */}
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0 border-l-2 ${
                  nextDark ? "border-dashed border-muted" : "border-solid border-accent/30"
                }`}
              />
            )}
            {/* Node */}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                s.dark
                  ? "border-dashed border-muted-foreground/50 bg-background text-muted-foreground"
                  : "border-accent bg-accent text-accent-foreground"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className={`text-base font-semibold ${s.dark ? "text-muted-foreground" : "text-foreground"}`}>
                  {s.title}
                </h3>
                <span className="text-xs text-muted-foreground">{s.owner}</span>
                {s.dark && (
                  <span className="rounded-full border border-dashed border-muted-foreground/50 px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                    {darkLabel}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
