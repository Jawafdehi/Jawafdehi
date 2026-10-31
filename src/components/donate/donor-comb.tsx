import { useTranslation } from "react-i18next";

import { donors, type Donor } from "@/data/donors";
import { cn } from "@/lib/utils";

/**
 * A honeycomb interlocks only when its rows alternate between a full row and one
 * that is a cell shorter. Both rows are centred, so the short one drops into the
 * notches on its own. The obvious alternative — keeping every row the same width
 * and nudging the odd ones sideways with `translateX` — pushes the last cell past
 * a 320px viewport, and /donate is gated on exactly that (see
 * tests/e2e-pw/responsive.mobile.spec.ts, which measures it at 94px over before
 * the August fixes).
 */
const ROW_PATTERN = [4, 3];

/**
 * Split the wall into centred rows whose widths cycle through ROW_PATTERN.
 *
 * A row that runs out of donors is padded to its pattern width with `null`,
 * because the nesting is a consequence of the row's *width*, not its contents.
 * Ten donors fill rows of 4, 3 and 3; left unpadded, that last row of three
 * centres to exactly the same columns as the three above it and the two rows
 * collide instead of interlocking. Padded, it is a four-wide row holding three
 * people, and it drops into the notches like every other row. The first row has
 * nothing above it to nest into, so it is never padded — otherwise a wall that
 * fits on one row would sit visibly off-centre under its own heading.
 */
function honeycombRows(people: readonly Donor[]): (Donor | null)[][] {
  const rows: (Donor | null)[][] = [];

  for (let start = 0, row = 0; start < people.length; row++) {
    const width = ROW_PATTERN[row % ROW_PATTERN.length];
    const cells: (Donor | null)[] = people.slice(start, start + width);

    if (row > 0) {
      while (cells.length < width) cells.push(null);
    }

    rows.push(cells);
    start += width;
  }

  return rows;
}

/**
 * Per-cell float timing, derived from the cell's position so it is stable
 * across renders and never needs a random seed.
 *
 * Both the offset and the period vary. With a shared period the comb would
 * drift as one block however the delays were spread — ten cells on the same
 * cycle resynchronise visibly. Varying the period too means no two neighbours
 * hold a phase for long, which is what makes it read as a crowd breathing
 * rather than a grid pulsing.
 *
 * The moduli are 9 and 7 rather than anything rounder because `position` only
 * ever takes the values {0,3,5,6,8,10,11,13,15,16,21} for the current comb
 * shape. Modulo 5 collapsed that to three distinct durations — measured, not
 * assumed — and the wall visibly beat in three groups.
 */
function floatTiming(rowIndex: number, cellIndex: number) {
  const position = rowIndex * 3 + cellIndex * 5;

  return {
    animationDelay: `${((position % 9) * 0.35).toFixed(2)}s`,
    animationDuration: `${(4.2 + (position % 7) * 0.3).toFixed(1)}s`,
  };
}

/**
 * The people who fund the archive, as the opening node of the donation journey.
 *
 * Someone without a photo shows their name rather than their initials: "SM"
 * identifies nobody and reads as a placeholder, which is the opposite of what a
 * wall of supporters is for. Two lines of a hexagon hold a typical Nepali name
 * at this size; anything longer clamps with an ellipsis.
 *
 * The two custom properties drive both the cell box and the row overlap, so the
 * comb stays one shape at every width. 0.866 is the width-to-height ratio of a
 * regular hexagon (√3/2); a quarter of the height is how far rows have to climb
 * to interlock.
 */
export function DonorComb() {
  const { t } = useTranslation();
  const rows = honeycombRows(donors);

  return (
    <div
      role="group"
      aria-label={t("donate.journey.wallLabel")}
      className="flex flex-col items-center [--hex-h:calc(var(--hex-w)/0.866)] [--hex-w:clamp(52px,12vw,78px)]"
    >
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "flex gap-2",
            rowIndex > 0 && "mt-[calc(var(--hex-h)*-0.25)]",
          )}
        >
          {row.map((donor, cellIndex) =>
            donor === null ? (
              <div
                key={`${rowIndex}-${cellIndex}`}
                aria-hidden="true"
                className="h-[var(--hex-h)] w-[var(--hex-w)] shrink-0"
              />
            ) : (
              <div
                key={`${rowIndex}-${cellIndex}`}
                style={floatTiming(rowIndex, cellIndex)}
                className="flex h-[var(--hex-h)] w-[var(--hex-w)] shrink-0 animate-donor-float items-center justify-center bg-primary/10 [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)] motion-reduce:animate-none"
              >
                {donor.photo ? (
                  <img
                    src={donor.photo}
                    alt={donor.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="line-clamp-2 px-1 text-center text-[10px] font-semibold leading-tight text-primary md:text-xs">
                    {donor.name}
                  </span>
                )}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
}
