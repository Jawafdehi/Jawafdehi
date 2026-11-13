import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  DisclosureRow,
  OptionList,
  OptionMarker,
  RadioRow,
  RangeField,
} from "@/components/search/filter-controls";
import {
  hasUsableRails,
  parseBigoBound,
  type BigoBounds,
  type BigoExtent,
} from "@/lib/bigo-range";
import { formatAmountInput, stripAmountFormatting } from "@/utils/number";

export type { BigoBounds };

type BigoRangeFilterProps = {
  /** Corpus extent from the API. Absent → no control. */
  extent?: BigoExtent;
  min?: number;
  max?: number;
  onCommit: (bounds: BigoBounds) => void;
};

const CRORE = 10_000_000;
const ARAB = 1_000_000_000;

/**
 * Five ranges, a decade each, in the units the amounts are read in. The
 * amounts span six orders of magnitude, so equal-width ranges would put every
 * case in the first.
 */
const BIGO_PRESETS: ReadonlyArray<{ key: string; label: string; bounds: BigoBounds }> = [
  { key: "under1cr", label: "Under Rs 1 crore", bounds: { max: CRORE } },
  { key: "1to10cr", label: "Rs 1 – 10 crore", bounds: { min: CRORE, max: 10 * CRORE } },
  { key: "10to100cr", label: "Rs 10 – 100 crore", bounds: { min: 10 * CRORE, max: ARAB } },
  { key: "1to10arab", label: "Rs 1 – 10 arab", bounds: { min: ARAB, max: 10 * ARAB } },
  { key: "over10arab", label: "Over Rs 10 arab", bounds: { min: 10 * ARAB } },
];

const samePreset = (a: BigoBounds, min?: number, max?: number) => a.min === min && a.max === max;

/**
 * The बिगो amount filter: five preset ranges, and a typed range behind
 * "Custom range".
 *
 * ## Why presets, and why not the slider
 *
 * A slider was the control here, with two amount fields beneath it. Usability
 * research on range filters (Baymard Institute) finds the fields are the part
 * that cannot go — sliders are imprecise, and over half of test participants
 * misread a two-thumb slider — and that a slider's only real benefit is
 * exploration. Presets explore better: each row is a meaningful size of case,
 * which gives back the "information scent" the slider never had, and a first
 * visitor no longer has to guess what a typical amount is. The researcher with
 * an exact bound in mind still has it, one click away under "Custom range".
 *
 * Presets are single-select: a range is one question. Choosing the selected
 * one again clears it.
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

  // Text of the two amount fields. Held separately from the committed bounds so a
  // half-typed number is not parsed on every keystroke; committed on blur/Enter.
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");

  const activePreset = BIGO_PRESETS.find((preset) => samePreset(preset.bounds, min, max));
  const isFiltered = min !== undefined || max !== undefined;
  const isCustom = isFiltered && !activePreset;
  // A bound that is not one of the presets came from the custom fields (or a
  // shared link), so the fields open to show it.
  const [customOpen, setCustomOpen] = useState(isCustom);

  // Re-sync when the URL moves underneath us — a preset, a pill removal,
  // "Clear", or the back button.
  useEffect(() => {
    setDraftMin(min === undefined ? "" : formatAmountInput(String(min)));
    setDraftMax(max === undefined ? "" : formatAmountInput(String(max)));
  }, [min, max]);

  if (!hasUsableRails(extent)) return null;

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
    <RangeField
      id={id}
      // `inputMode` rather than type="number": the grouped display ("1,00,00,000")
      // is not a valid number input value, and spinners are useless at this scale.
      inputMode="numeric"
      label={label}
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
  );

  return (
    <fieldset aria-labelledby={labelId} className="min-w-0">
      <legend className="mb-1.5 text-sm text-muted-foreground" id={labelId}>
        {t("archiveSearch.filters.bigo", "Embezzled amount")}
      </legend>

      <OptionList>
        {BIGO_PRESETS.map((preset) => {
          const isChecked = activePreset?.key === preset.key;
          return (
            <RadioRow
              checked={isChecked}
              key={preset.key}
              onClick={() => onCommit(isChecked ? {} : preset.bounds)}
            >
              {t(`archiveSearch.filters.bigoPresets.${preset.key}`, preset.label)}
            </RadioRow>
          );
        })}

        {/* "Custom range" is the sixth row of the same list rather than a
            link under it: one more way to answer the same question. Its dot
            fills while a typed range is in force; the fields open beneath. */}
        <DisclosureRow
          marker={<OptionMarker checked={isCustom} shape="radio" />}
          onClick={() => setCustomOpen((open) => !open)}
          open={customOpen}
        >
          {t("archiveSearch.filters.bigoCustom", "Custom range")}
        </DisclosureRow>
      </OptionList>

      {customOpen ? (
        // Stacked, not side by side: "१,००,००,००,०००" is 13 characters, and two
        // fields sharing the sidebar truncate the value the reader just typed.
        <div className="mt-1 space-y-2 pl-7">
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
      ) : null}
    </fieldset>
  );
}
