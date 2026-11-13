import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  DisclosureRow,
  OptionList,
  OptionMarker,
  RadioRow,
  RangeField,
} from "@/components/search/filter-controls";
import {
  activePreset,
  DATE_PRESETS,
  presetStartDate,
  type DateBounds,
  type DatePreset,
} from "@/lib/date-range";

export type { DateBounds };

/**
 * English fallbacks for the preset labels.
 *
 * The keys live under `materialsLanding.filters.presets.*` — reused, not
 * duplicated, because the /materials panel already offers these four windows in
 * both languages and two spellings of "Last 6 months" is exactly the kind of
 * drift a shared key prevents. The fallbacks are still spelled out here: every
 * other `t()` in this column passes one, so a missing key degrades to English
 * rather than rendering a dotted key path at a reader.
 */
const PRESET_FALLBACK: Record<DatePreset, string> = {
  all: "All time",
  "30-days": "Last 30 days",
  "6-months": "Last 6 months",
  "1-year": "Last year",
};

type DateRangeFilterProps = {
  from?: string;
  to?: string;
  onCommit: (bounds: DateBounds) => void;
  /**
   * Injected so the preset arithmetic is testable without freezing the clock.
   * Defaults to now, which is what every caller wants.
   */
  today?: Date;
};

/**
 * The record-date filter: four preset windows over two exact date fields.
 *
 * ## Why presets AND fields
 *
 * They answer different questions. "What has the CIAA published lately" is a
 * preset — one tap, no typing, and the three windows cover most of it. "What was
 * filed during the 2079/80 fiscal year" is a range, and no set of presets will
 * ever contain it. The /materials landing panel already pairs them this way and
 * the labels are already translated, so this is the same control in a narrower
 * column rather than a second idiom for the same job.
 *
 * The pressed preset is DERIVED from the bounds (`activePreset`), not stored
 * beside them. The URL is the only state, so a shared link, the back button and a
 * pill removal all have to light the right pill with nothing else to consult.
 *
 * ## `<input type="date">`, not a custom calendar
 *
 * The native control brings a picker, a keyboard path, locale-appropriate display
 * order and the `YYYY-MM-DD` value format the API wants — and it cannot emit an
 * impossible date, which removes a whole class of 400. The labels say "(AD)"
 * because the archive is bilingual and the corpus also carries Bikram Sambat
 * dates on many documents; the indexed field this filters is Gregorian, and not
 * saying so would invite a reader to type २०८० and get nothing.
 *
 * Each field constrains the other with `min`/`max`, so the inverted state is
 * mostly unreachable by picker. It stays reachable by typing and by URL, which is
 * what `readDateBounds` and the commit path below handle.
 */
export function DateRangeFilter({
  from,
  to,
  onCommit,
  today,
}: Readonly<DateRangeFilterProps>) {
  const { t } = useTranslation();
  const labelId = useId();
  const fromFieldId = useId();
  const toFieldId = useId();

  const now = today ?? new Date();
  const pressed = activePreset({ from, to }, now);
  // A range no preset names came from the fields (or a shared link), so they
  // open to show it.
  const [customOpen, setCustomOpen] = useState(pressed === null);

  const choosePreset = (preset: DatePreset) => {
    // A preset REPLACES the whole range rather than merging with it: keeping a
    // stale upper bound would make "last 30 days" mean something the pill does
    // not say, and there is no reading of the tap that wants the old `to` back.
    const start = presetStartDate(preset, now);
    onCommit(start ? { from: start } : {});
  };

  const commitBound = (which: "from" | "to", raw: string) => {
    // An empty field clears that side. The native control cannot produce a
    // malformed value, so there is nothing to reject here — `readDateBounds`
    // still guards the URL, which is the path that can carry one.
    const value = raw || undefined;
    const next: DateBounds =
      which === "from" ? { from: value, to } : { from, to: value };
    // An inverted pair is the reader mid-thought, not an error worth shouting
    // about: keep the side they just set and drop the other. Same call as the
    // बिगो fields make.
    if (
      next.from !== undefined &&
      next.to !== undefined &&
      next.from > next.to
    ) {
      onCommit(which === "from" ? { from: value } : { to: value });
      return;
    }
    onCommit(next);
  };

  const dateField = (
    which: "from" | "to",
    id: string,
    value: string | undefined,
    label: string,
    limits: { min?: string; max?: string },
  ) => (
    // `[color-scheme]` keeps the native picker's own chrome legible in either
    // theme, as the /materials panel does.
    <RangeField
      className="[color-scheme:light] dark:[color-scheme:dark]"
      id={id}
      label={label}
      max={limits.max}
      min={limits.min}
      onChange={(event) => commitBound(which, event.target.value)}
      type="date"
      value={value ?? ""}
    />
  );

  return (
    <fieldset aria-labelledby={labelId} className="min-w-0">
      <legend className="mb-2 text-sm text-muted-foreground" id={labelId}>
        {t("archiveSearch.filters.date", "Record date")}
      </legend>

      {/* The same list as the amount filter: the windows as single-choice
          rows, then "Custom range", which opens the two exact fields. */}
      <OptionList>
        {DATE_PRESETS.map((preset) => (
          <RadioRow
            checked={pressed === preset}
            key={preset}
            onClick={() => choosePreset(preset)}
          >
            {t(
              `materialsLanding.filters.presets.${preset}`,
              PRESET_FALLBACK[preset],
            )}
          </RadioRow>
        ))}
        <DisclosureRow
          marker={<OptionMarker checked={pressed === null} shape="radio" />}
          onClick={() => setCustomOpen((open) => !open)}
          open={customOpen}
        >
          {t("archiveSearch.filters.bigoCustom", "Custom range")}
        </DisclosureRow>
      </OptionList>

      {/*
        Stacked rather than side by side, for the same reason the बिगो fields are:
        a native date field renders a picker affordance next to its value, and two
        of them sharing a 250px sidebar truncate the date the reader just picked.
      */}
      {customOpen ? (
        <div className="mt-1 space-y-2 pl-7">
          {dateField(
            "from",
            fromFieldId,
            from,
            t("archiveSearch.filters.dateFromField", "From (AD)"),
            { max: to },
          )}
          {dateField(
            "to",
            toFieldId,
            to,
            t("archiveSearch.filters.dateToField", "To (AD)"),
            { min: from },
          )}
        </div>
      ) : null}
    </fieldset>
  );
}
