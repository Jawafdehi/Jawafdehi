import { useTranslation } from "react-i18next";

import type { BigoBucket } from "@/lib/bigo-range";
import { cn } from "@/lib/utils";

/**
 * The distribution of recorded बिगो amounts, as bars behind the range slider.
 *
 * This is the "information scent" numeric filters are usually missing — UXmatters
 * names *lacking inventory information* one of the three core failures of numeric
 * filters, and Baymard measures a distribution histogram at +20–30% filter
 * engagement, largely because it stops readers over-constraining into an empty
 * page. Without it a reader drags blind and reads "no results" as "no such cases".
 *
 * Hand-rolled rather than charted. This repo has recharts, but it is ~110 KB gzip
 * and was deliberately pushed off the critical path (#331); `/search` is a core
 * route under a 350 KB budget (scripts/bundle-budget.mjs). A dozen divs cost
 * nothing and there is no axis, legend, tooltip or animation to justify a library.
 *
 * `aria-hidden`: the bars are a redundant visual summary. Every number they encode
 * reaches assistive tech through the amount inputs, the thumb values and the match
 * count — an unlabelled bar chart read aloud is noise, not information.
 */
export function BigoHistogram({
  buckets,
  selection,
}: Readonly<{
  buckets: BigoBucket[];
  /** Bar indices inside the current range; others dim rather than disappear. */
  selection: { first: number; last: number };
}>) {
  const { t } = useTranslation();
  const tallest = Math.max(...buckets.map((bucket) => bucket.count), 1);

  if (!buckets.length) return null;

  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-full items-end gap-px"
      // The bars sit directly above the track they describe, so the reader reads
      // position-to-position rather than having to map one scale onto another.
      data-testid="bigo-histogram"
    >
      {buckets.map((bucket, index) => {
        const inRange = index >= selection.first && index <= selection.last;
        return (
          <div
            className="flex h-full flex-1 items-end"
            key={`${bucket.from ?? "min"}-${bucket.to ?? "max"}`}
            title={t("archiveSearch.filters.bigoBarTitle", {
              defaultValue: "{{cases}} cases",
              cases: bucket.count,
            })}
          >
            <div
              className={cn(
                "w-full rounded-sm transition-colors",
                // Out-of-range bars DIM rather than vanish. The shape is what
                // tells the reader where to drag next; erasing it the moment they
                // narrow removes the guidance exactly when it is needed.
                inRange ? "bg-primary" : "bg-muted-foreground/25",
              )}
              style={{
                // A floor of 2px so a bucket holding one case is still visibly
                // different from an empty one — the gap between "nothing here"
                // and "something here" is the whole point of the chart.
                height: bucket.count
                  ? `${Math.max(8, (bucket.count / tallest) * 100)}%`
                  : "2px",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
