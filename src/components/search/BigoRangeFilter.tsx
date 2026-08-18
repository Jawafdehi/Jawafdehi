import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { Slider } from "@/components/ui/slider";
import {
  boundToIndex,
  buildBigoLadder,
  describeBigoRange,
  indexToBound,
  type BigoExtent,
} from "@/lib/bigo-range";
import { formatBigo } from "@/utils/number";

type BigoRangeFilterProps = {
  /** Corpus extent from the API. Absent → no rails, so no control. */
  extent?: BigoExtent;
  min?: number;
  max?: number;
  onCommit: (bounds: { min?: number; max?: number }) => void;
};

export function BigoRangeFilter({
  extent,
  min,
  max,
  onCommit,
}: Readonly<BigoRangeFilterProps>) {
  const { t } = useTranslation();
  const labelId = useId();

  // The ladder is derived from the corpus, so it can legitimately be too short
  // to drag along (one case, or a corpus with no recorded amount at all). No
  // rails, no control — better than a slider pinned shut.
  const ladder = extent ? buildBigoLadder(extent) : [];
  const usable = ladder.length >= 2;

  const lastIndex = ladder.length - 1;
  const committed: [number, number] = [
    boundToIndex(ladder, min, 0),
    boundToIndex(ladder, max, lastIndex),
  ];

  // Local position so dragging is smooth; the URL only moves on commit (pointer
  // release / key up), which is what keeps a drag from firing a request per step.
  const [dragging, setDragging] = useState<[number, number] | null>(null);
  const position = dragging ?? committed;

  // Re-sync when the URL changes underneath us — a pill removal, "Clear", or the
  // back button. Keyed on the committed pair so a drag in progress is not yanked.
  useEffect(() => setDragging(null), [min, max]);

  if (!usable) return null;

  const previewMin = indexToBound(ladder, position[0], "min");
  const previewMax = indexToBound(ladder, position[1], "max");

  return (
    <fieldset aria-labelledby={labelId} className="min-w-0">
      <legend
        className="mb-1.5 text-sm font-semibold text-foreground"
        id={labelId}
      >
        {t("archiveSearch.filters.bigo", "बिगो (amount)")}
      </legend>

      {/*
        The readout is the label for the track: the thumbs carry ladder indices,
        which are meaningless on their own, so the amounts have to be on screen.
        aria-live keeps a keyboard user informed as they step, since the visible
        text is the only place the pairing is stated.
      */}
      <p
        aria-live="polite"
        className="mb-2 text-sm font-medium tabular-nums text-foreground"
      >
        {describeBigoRange(previewMin, previewMax, t)}
      </p>

      <Slider
        className="mb-2"
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
        // Each thumb announces the AMOUNT, not its ladder index — the index is an
        // implementation detail and would be gibberish read aloud.
        thumbProps={[
          {
            "aria-label": t("archiveSearch.filters.bigoMinThumb", "Minimum amount"),
            "aria-valuetext":
              previewMin === undefined
                ? t("archiveSearch.filters.bigoNoMin", "No minimum")
                : formatBigo(previewMin),
          },
          {
            "aria-label": t("archiveSearch.filters.bigoMaxThumb", "Maximum amount"),
            "aria-valuetext":
              previewMax === undefined
                ? t("archiveSearch.filters.bigoNoMax", "No maximum")
                : formatBigo(previewMax),
          },
        ]}
        value={position}
      />

      {/* The rails, so the track's span is legible without dragging to find it. */}
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatBigo(ladder[0])}</span>
        <span>{formatBigo(ladder[lastIndex])}</span>
      </div>

      {/*
        Cases with no recorded amount are excluded by ANY bound — a range clause
        cannot match an absent field. Say so, with the real numbers, rather than
        letting their disappearance read as "there are no such cases".
      */}
      {extent ? (
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {/* `cases`, not `count` — i18next reserves `count` for plural key
              resolution, which would send this looking for bigoNote_one. */}
          {t("archiveSearch.filters.bigoNote", {
            defaultValue:
              "Filtering by amount includes only the {{cases}} cases with a recorded बिगो.",
            cases: extent.count,
          })}
        </p>
      ) : null}
    </fieldset>
  );
}
