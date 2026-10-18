/**
 * A DEV-ONLY switch between candidate layouts for opening a table.
 *
 * Gated on `import.meta.env.DEV`, so the control and the choice it writes are
 * dead code in a production build and Rollup drops them. Nothing here changes
 * what a visitor to jawafdehi.org sees; it exists so the three approaches can
 * be put side by side on real documents before one is chosen.
 *
 * The question it is here to answer: a 14-column OCR'd government table does
 * not fit the 630px column the Contents tab gives it, and the archive's whole
 * value is that a finding can be cited. Those two pull in different
 * directions — a wider view and an addressable one are not the same change.
 *
 *   inline  what ships today: the table expands inside the panel column.
 *   wide    the same expansion, but the open table breaks out to the full
 *           page width. Fixes the squeeze, stays un-citable.
 *   page    the row becomes a link to `?table=<key>`, a focused full-width
 *           view with its own URL. Citable and shareable; costs a navigation
 *           for a reader who only wanted a glance.
 *
 * Remove this file, and the `layout` prop it feeds, once the choice is made.
 */

const CONTENT_LAYOUTS = ["inline", "wide", "page"] as const;
export type ContentLayout = (typeof CONTENT_LAYOUTS)[number];

const LAYOUT_BLURB: Record<ContentLayout, string> = {
  inline: "Ships today — opens inside the 630px panel column.",
  wide: "Opens in place but breaks out to the full page width.",
  page: "Row links to ?table=<key> — a focused view with its own URL.",
};

export function ContentLayoutLab({
  layout,
  onChange,
}: {
  layout: ContentLayout;
  onChange: (next: ContentLayout) => void;
}) {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="mb-4 rounded-md border border-dashed border-accent/60 bg-accent/5 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
        Dev only · table layout
      </p>
      <div className="flex flex-wrap gap-2">
        {CONTENT_LAYOUTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={layout === option}
            className={
              layout === option
                ? "rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white"
                : "rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            }
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {LAYOUT_BLURB[layout]}
      </p>
    </div>
  );
}
