import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Slider } from "@/components/ui/slider";
import {
  boundToIndex,
  buildBigoLadder,
  describeBigoRange,
  hasUsableRails,
  indexToBound,
  parseBigoBound,
  type BigoBounds,
  type BigoExtent,
} from "@/lib/bigo-range";
import {
  formatAmountInput,
  formatBigo,
  stripAmountFormatting,
} from "@/utils/number";

export type { BigoBounds };

type BigoRangeFilterProps = {
  /** Corpus extent from the API. Absent → no control. */
  extent?: BigoExtent;
  min?: number;
  max?: number;
  onCommit: (bounds: BigoBounds) => void;
};

/**
 * The बिगो amount filter: a two-thumb range slider over a log ladder, with the
 * exact amounts beneath it.
 *
 * The shape every price filter uses, and deliberately so — a reader already
 * knows how to work it, which is worth more here than any novelty. Track, its
 * endpoints, two fields, and (only while unfiltered) the coverage caveat.
 *
 * ## Why a log scale is not optional
 *
 * The amounts span six orders of magnitude. On a linear track across this 250px
 * sidebar the median case sits 0.19px from the left edge — half the corpus in one
 * pixel. The ladder in `bigo-range.ts` puts it at 123px. See that module for the
 * index-vs-amount reasoning behind `aria-valuetext`.
 *
 * ## What this replaced, and why the earlier objections do not apply
 *
 * A clickable histogram briefly stood here. It showed the distribution, but the
 * bars were also the control, which needed explaining: three lines of help text,
 * a shift-click gesture impossible on touch, and nine stacked blocks in a column
 * shared with four other filter groups.
 *
 * The slider was itself removed once before, for reasons that were really about
 * running it ALONGSIDE that histogram — two scales that never lined up, and a
 * drag preview that reported the previous range's count. With no bars there is
 * one scale. What is genuinely lost is the distribution's "information scent":
 * nothing here now shows WHERE the cases sit, so a reader can narrow into an
 * empty range and only find out from the results.
 *
 * WCAG 2.2 SC 2.5.7 (Dragging Movements) is satisfied by the amount fields:
 * every range reachable by dragging is reachable by typing, and the thumbs are
 * arrow-key operable besides.
 */
export function BigoRangeFilter({
  extent,
  min,
  max,
  onCommit,
}: Readonly<BigoRangeFilterProps>) {
  const { t } = useTranslation();
  const labelId = useId();
  const minFieldId = useId();
  const maxFieldId = useId();

  // Position while dragging. The URL only moves on commit (pointer release / key
  // up), so dragging a 20-stop track is one request rather than twenty.
  const [dragging, setDragging] = useState<[number, number] | null>(null);

  // Text of the two amount fields. Held separately from the committed bounds so a
  // half-typed number is not parsed on every keystroke; committed on blur/Enter.
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");

  // Re-sync when the URL moves underneath us — the slider itself, a pill removal,
  // "Clear", or the back button.
  useEffect(() => {
    setDragging(null);
    setDraftMin(min === undefined ? "" : formatAmountInput(String(min)));
    setDraftMax(max === undefined ? "" : formatAmountInput(String(max)));
  }, [min, max]);

  if (!hasUsableRails(extent)) return null;

  const ladder = buildBigoLadder(extent);
  const lastIndex = ladder.length - 1;
  const committed: [number, number] = [
    boundToIndex(ladder, min, 0),
    boundToIndex(ladder, max, lastIndex),
  ];
  const position = dragging ?? committed;
  const isFiltered = min !== undefined || max !== undefined;

  // What each thumb ANNOUNCES, which is not always what it sits on.
  //
  // While dragging, the ladder value under the thumb: that is what releasing
  // will commit, and it is the only thing that can be reported before the URL
  // moves. At rest, the COMMITTED bound — because `indexToBound` is undefined at
  // either end of the ladder, and a real bound can snap there. The ladder floor
  // is the round number below the smallest recorded amount, so ?bigo_min=25000
  // parks the thumb on index 0 while the filter, the URL and the pill all carry
  // रु 25,000; deriving the text from the position announced "No minimum" about
  // a minimum that was very much applied.
  //
  // The snap is a rendering decision — the thumb has to go somewhere. The
  // announcement is a claim about the filter, so it follows the filter.
  const announcedMin = dragging
    ? indexToBound(ladder, position[0], "min")
    : min;
  const announcedMax = dragging
    ? indexToBound(ladder, position[1], "max")
    : max;

  const commitDraft = (which: "min" | "max", raw: string) => {
    const digits = stripAmountFormatting(raw);
    // An empty field clears that side. Anything the API would reject is dropped
    // rather than sent — a 400 renders as the red "could not be loaded" alert,
    // which reads as an outage instead of a typo.
    const parsed = digits === "" ? undefined : parseBigoBound(digits);
    const next: BigoBounds =
      which === "min" ? { max, min: parsed } : { max: parsed, min };
    // An inverted pair is the reader mid-thought, not an error worth shouting
    // about: keep the side they just typed and drop the other.
    if (next.min !== undefined && next.max !== undefined && next.min > next.max) {
      onCommit(which === "min" ? { min: parsed } : { max: parsed });
      return;
    }
    onCommit(next);
  };

  const amountField = (
    which: "min" | "max",
    id: string,
    value: string,
    setValue: (next: string) => void,
    label: string,
    placeholder: number,
  ) => (
    <div className="min-w-0 flex-1">
      <label className="mb-1 block text-xs text-muted-foreground" htmlFor={id}>
        {label}
      </label>
      {/*
        `font-input` (16px on touch, 14px with a real pointer) rather than a raw
        size utility: a sub-16px field zooms the whole page the moment it takes
        focus on iOS. tests/layout/input-font-size.test.ts enforces this — and it
        reads the element's own markup, so naming the banned utility anywhere
        inside the tag, even in a comment, trips it.
      */}
      <input
        className="font-input h-11 w-full min-w-0 rounded-md border bg-background px-2 tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        id={id}
        // `inputMode` rather than type="number": the grouped display ("1,00,00,000")
        // is not a valid number input value, and spinners are useless at this scale.
        inputMode="numeric"
        onBlur={(event) => commitDraft(which, event.target.value)}
        onChange={(event) =>
          setValue(formatAmountInput(stripAmountFormatting(event.target.value)))
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitDraft(which, (event.target as HTMLInputElement).value);
          }
        }}
        placeholder={formatAmountInput(String(placeholder))}
        value={value}
      />
    </div>
  );

  return (
    <fieldset aria-labelledby={labelId} className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-foreground" id={labelId}>
        {t("archiveSearch.filters.bigo", "बिगो (amount)")}
      </legend>

      <Slider
        className="mt-1"
        max={lastIndex}
        min={0}
        minStepsBetweenThumbs={0}
        onValueChange={([low, high]) => setDragging([low, high])}
        onValueCommit={([low, high]) =>
          onCommit({
            min: indexToBound(ladder, low, "min"),
            max: indexToBound(ladder, high, "max"),
          })
        }
        step={1}
        thumbProps={[
          {
            "aria-label": t("archiveSearch.filters.bigoMinThumb", "Minimum amount"),
            // The thumb's aria-valuenow is necessarily a ladder index; "7 of 20"
            // tells a listener nothing about money, so the amount is spelled out.
            "aria-valuetext":
              announcedMin === undefined
                ? t("archiveSearch.filters.bigoNoMin", "No minimum")
                : formatBigo(announcedMin),
          },
          {
            "aria-label": t("archiveSearch.filters.bigoMaxThumb", "Maximum amount"),
            "aria-valuetext":
              announcedMax === undefined
                ? t("archiveSearch.filters.bigoNoMax", "No maximum")
                : formatBigo(announcedMax),
          },
        ]}
        value={position}
      />

      {/*
        The track's endpoints, so the scale is legible at a glance and a thumb
        parked at either end visibly means "no bound".
      */}
      <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatBigo(ladder[0])}</span>
        <span>{formatBigo(ladder[lastIndex])}</span>
      </div>

      {/*
        Stacked, not side by side: "१,००,००,००,०००" is 13 characters, and two
        fields sharing a 250px sidebar truncate the value the reader just typed —
        an editable field that hides its own contents is worse than a tall panel.
      */}
      <div className="mt-3 space-y-2">
        {amountField(
          "min",
          minFieldId,
          draftMin,
          setDraftMin,
          t("archiveSearch.filters.bigoMinField", "Min (Rs)"),
          extent.min,
        )}
        {amountField(
          "max",
          maxFieldId,
          draftMax,
          setDraftMax,
          t("archiveSearch.filters.bigoMaxField", "Max (Rs)"),
          extent.max,
        )}
      </div>

      {/*
        The caveat only, and only while unfiltered.

        A "<range> · N cases" readout used to sit here too. It was redundant three
        times over — the removable pill above the results carries the range, the
        two fields carry it as digits, and the result header carries the count —
        so it was noise in a column already shared with four other filter groups.

        This is NOT redundant. Cases with no recorded amount are excluded by ANY
        bound, because a range clause cannot match an absent field, and nothing
        else on the page says so. Without it their disappearance reads as "there
        are no such cases" rather than "this filter cannot see them", which on an
        accountability archive is the difference between a gap and a claim.
      */}
      {!isFiltered && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {t("archiveSearch.filters.bigoNote", {
            count: extent.count,
            defaultValue:
              "Filtering by amount includes only the {{count}} cases with a recorded बिगो.",
            defaultValue_one:
              "Filtering by amount includes only the {{count}} case with a recorded बिगो.",
          })}
        </p>
      )}
    </fieldset>
  );
}
