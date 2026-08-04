export type AccountabilityStage = {
  key: string;
  /** Which institution owns this stage, e.g. "CIAA" or "Special Court". */
  owner: string;
  title: string;
  body: string;
  /**
   * The stage happens, but we hold no data on what it produces. Drawn hollow with a dashed
   * rail so a reader can see exactly where OUR record stops.
   *
   * Named for what we can honestly claim. This was `dark`, as in "the pipeline goes dark",
   * which quietly asserted that nothing anywhere records the stage. We cannot know that — we
   * can only say we looked and did not find it. The copy has to stay on the right side of
   * that line, so the prop does too.
   */
  noData?: boolean;
};

/**
 * The accountability pipeline as an ordered walk, not a list of findings: a complaint
 * enters at the top and either drops out or reaches the next stage. A vertical rail
 * carries the reader down it — vertical rather than horizontal because each stage needs a
 * few sentences to be honest, and horizontal steps would truncate them.
 *
 * The last stages are `noData`: the rail goes dashed and the node hollow at the exact point
 * our own record stops, which is the section's argument.
 */
export function AccountabilityStages({
  stages,
  noDataLabel,
}: {
  stages: AccountabilityStage[];
  /** Badge on stages we hold no outcome data for, e.g. "No data yet". */
  noDataLabel: string;
}) {
  return (
    <ol className="relative space-y-0" aria-label={stages.map((s) => s.title).join(" → ")}>
      {stages.map((s, i) => {
        const last = i === stages.length - 1;
        // A segment is dashed when the stage it leads INTO has no data, so the rail changes
        // character at the boundary where our record stops rather than one stage late.
        const nextNoData = !last && stages[i + 1].noData;
        return (
          <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Rail */}
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0 border-l-2 ${
                  nextNoData ? "border-dashed border-muted" : "border-solid border-accent/30"
                }`}
              />
            )}
            {/* Node */}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                s.noData
                  ? "border-dashed border-muted-foreground/50 bg-background text-muted-foreground"
                  : "border-accent bg-accent text-accent-foreground"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className={`text-base font-semibold ${s.noData ? "text-muted-foreground" : "text-foreground"}`}>
                  {s.title}
                </h3>
                <span className="text-xs text-muted-foreground">{s.owner}</span>
                {s.noData && (
                  <span className="rounded-full border border-dashed border-muted-foreground/50 px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                    {noDataLabel}
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
