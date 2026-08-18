import { useEffect, useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BigoHistogram } from "@/components/search/BigoHistogram";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  boundToIndex,
  describeBigoRange,
  hasUsableRails,
  indexToBound,
  parseBigoBound,
  type BigoExtent,
} from "@/lib/bigo-range";
import {
  formatAmountInput,
  formatBigo,
  stripAmountFormatting,
} from "@/utils/number";

/** रु १ करोड — 59 of the 68 cases with a recorded amount clear it. */
const COMMON_MINIMUM = 10_000_000;

export type BigoBounds = { min?: number; max?: number };

type BigoRangeFilterProps = {
  /** Corpus rails + bar counts from the API. Absent → no control. */
  extent?: BigoExtent;
  min?: number;
  max?: number;
  /** Cases matching the current search, for the "what will this give me" count. */
  matchCount?: number;
  onCommit: (bounds: BigoBounds) => void;
};

/**
 * The बिगो amount filter: distribution, then a range slider over it, then two
 * amount fields.
 *
 * The three layers are not decoration — each answers a documented failure of
 * numeric filters:
 *
 * - the histogram supplies the inventory information UXmatters names as a core
 *   omission, and is what keeps a reader from narrowing into an empty page;
 * - the slider gives the fast approximate gesture, on a log scale because the
 *   amounts span six orders of magnitude;
 * - the amount fields are Baymard's requirement that a filtering slider "should
 *   always be accompanied by text input fields" — the precise path, and the one
 *   that works for anyone whom NN/g's motor-control objection rules out of
 *   dragging at all.
 */
export function BigoRangeFilter({
  extent,
  min,
  max,
  matchCount,
  onCommit,
}: Readonly<BigoRangeFilterProps>) {
  const { t } = useTranslation();
  const labelId = useId();
  const minFieldId = useId();
  const maxFieldId = useId();

  const usable = hasUsableRails(extent);
  const stops = usable ? extent.stops : [];
  const lastIndex = stops.length - 1;

  const committed: [number, number] = [
    boundToIndex(stops, min, 0),
    boundToIndex(stops, max, lastIndex),
  ];

  // Position while dragging. The URL only moves on commit (pointer release / key
  // up), so a 20-stop track is one request rather than twenty — but the bars and
  // the count preview follow the thumb live, which is the responsiveness
  // Baymard's fifth requirement asks for without a request per step.
  const [dragging, setDragging] = useState<[number, number] | null>(null);
  const position = dragging ?? committed;

  // Text of the two amount fields. Held separately from the committed bounds so a
  // half-typed number is not parsed on every keystroke; committed on blur/Enter.
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");

  // Re-sync when the URL moves underneath us — a pill removal, "Clear", the back
  // button, or the slider itself.
  useEffect(() => {
    setDragging(null);
    setDraftMin(min === undefined ? "" : formatAmountInput(String(min)));
    setDraftMax(max === undefined ? "" : formatAmountInput(String(max)));
  }, [min, max]);

  if (!usable) return null;

  const previewMin = indexToBound(stops, position[0], "min");
  const previewMax = indexToBound(stops, position[1], "max");
  const isFiltered = min !== undefined || max !== undefined;

  // Which bars fall inside the current selection, so the rest can dim. Compared
  // on the bar's own bounds rather than by index, since the bars sit on a coarser
  // ladder than the thumbs.
  const selection = {
    first: extent.buckets.findIndex(
      (bucket) => previewMin === undefined || bucket.to === null || bucket.to > previewMin,
    ),
    last: (() => {
      const after = extent.buckets.findIndex(
        (bucket) => previewMax !== undefined && bucket.from !== null && bucket.from >= previewMax,
      );
      return after === -1 ? extent.buckets.length - 1 : after - 1;
    })(),
  };

  const commitDraft = (which: "min" | "max", raw: string) => {
    const digits = stripAmountFormatting(raw);
    // An empty field clears that side. Anything the API would reject is dropped
    // rather than sent — a 400 renders as the red "could not be loaded" alert,
    // which reads as an outage instead of a typo.
    const parsed = digits === "" ? undefined : parseBigoBound(digits);
    const next: BigoBounds =
      which === "min" ? { min: parsed, max } : { min, max: parsed };
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
        placeholder={which === "min" ? formatAmountInput(String(extent.min)) : formatAmountInput(String(extent.max))}
        value={value}
      />
    </div>
  );

  return (
    <fieldset aria-labelledby={labelId} className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold text-foreground" id={labelId}>
        {t("archiveSearch.filters.bigo", "बिगो (amount)")}
      </legend>

      {/*
        Readout ABOVE the track, never below: on a touchscreen the reader's own
        finger covers whatever sits under the thumb, which is the one moment the
        value matters most (NN/g).
      */}
      <p
        aria-live="polite"
        className="mb-1.5 text-sm font-medium tabular-nums text-foreground"
      >
        {describeBigoRange(previewMin, previewMax, t)}
      </p>

      <BigoHistogram buckets={extent.buckets} selection={selection} />

      <Slider
        className="mt-1"
        max={lastIndex}
        min={0}
        minStepsBetweenThumbs={0}
        onValueChange={([low, high]) => setDragging([low, high])}
        onValueCommit={([low, high]) =>
          onCommit({
            min: indexToBound(stops, low, "min"),
            max: indexToBound(stops, high, "max"),
          })
        }
        step={1}
        // Opposing arrows, because more than half of Baymard's test subjects read
        // a dual-point slider as a single-value one. Two identical circles give a
        // reader nothing to tell "this end" from "that end".
        thumbProps={[
          {
            children: (
              <ChevronLeft aria-hidden="true" className="h-3 w-3 text-primary" />
            ),
            "aria-label": t("archiveSearch.filters.bigoMinThumb", "Minimum amount"),
            // The thumb's aria-valuenow is necessarily a ladder index; "7 of 20"
            // tells a listener nothing about money, so the amount is spelled out.
            "aria-valuetext":
              previewMin === undefined
                ? t("archiveSearch.filters.bigoNoMin", "No minimum")
                : formatBigo(previewMin),
          },
          {
            children: (
              <ChevronRight aria-hidden="true" className="h-3 w-3 text-primary" />
            ),
            "aria-label": t("archiveSearch.filters.bigoMaxThumb", "Maximum amount"),
            "aria-valuetext":
              previewMax === undefined
                ? t("archiveSearch.filters.bigoNoMax", "No maximum")
                : formatBigo(previewMax),
          },
        ]}
        value={position}
      />

      <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatBigo(stops[0])}</span>
        <span>{formatBigo(stops[lastIndex])}</span>
      </div>

      {/*
        The precise path, and the accessible one. Baymard: a filtering slider
        "should always be accompanied by text input fields acting as a fallback";
        NN/g: offer something a reader can "tap or even type" instead of a
        press-and-drag gesture.
      */}
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
        )}
        {amountField(
          "max",
          maxFieldId,
          draftMax,
          setDraftMax,
          t("archiveSearch.filters.bigoMaxField", "Max (Rs)"),
        )}
      </div>

      {/*
        The overwhelmingly common query is one-sided — 59 of the 68 cases with a
        recorded amount are over रु १ करोड — so it gets one tap rather than a drag.
      */}
      <Button
        aria-pressed={min === COMMON_MINIMUM && max === undefined}
        className="mt-2 h-11 px-3 text-xs"
        onClick={() =>
          onCommit(
            min === COMMON_MINIMUM && max === undefined
              ? {}
              : { min: COMMON_MINIMUM },
          )
        }
        type="button"
        variant={min === COMMON_MINIMUM && max === undefined ? "secondary" : "outline"}
      >
        {t("archiveSearch.filters.bigoCommonPreset", {
          defaultValue: "Over {{amount}}",
          amount: formatBigo(COMMON_MINIMUM),
        })}
      </Button>

      {/*
        What the current selection will actually give them, and — when unfiltered
        — how many cases the filter can reach at all. Cases with no recorded
        amount are excluded by ANY bound, since a range clause cannot match an
        absent field, so their disappearance needs saying rather than reading as
        "there are no such cases".
      */}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {isFiltered && matchCount !== undefined
          ? t("archiveSearch.filters.bigoMatchCount", {
              defaultValue: "{{cases}} cases in this range.",
              cases: matchCount,
            })
          : t("archiveSearch.filters.bigoNote", {
              defaultValue:
                "Filtering by amount includes only the {{cases}} cases with a recorded बिगो.",
              cases: extent.count,
            })}
      </p>
    </fieldset>
  );
}
