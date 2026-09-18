import { useId } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
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
  "all": "All time",
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
    if (next.from !== undefined && next.to !== undefined && next.from > next.to) {
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

        `[color-scheme]` keeps the native picker's own chrome legible; the site is
        pinned light today but the token block exists, so this matches what the
        /materials panel already does rather than assuming.
      */}
      <input
        className="font-input h-11 w-full min-w-0 rounded-md border bg-background px-2 tabular-nums text-foreground [color-scheme:light] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:[color-scheme:dark]"
        id={id}
        max={limits.max}
        min={limits.min}
        onChange={(event) => commitBound(which, event.target.value)}
        type="date"
        value={value ?? ""}
      />
    </div>
  );

  return (
    <fieldset aria-labelledby={labelId} className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-foreground" id={labelId}>
        {t("archiveSearch.filters.date", "Record date")}
      </legend>

      <div className="flex flex-wrap gap-1.5">
        {DATE_PRESETS.map((preset) => (
          <button
            aria-pressed={pressed === preset}
            className={cn(
              "rounded-full border px-2.5 py-1.5 text-xs outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              pressed === preset
                ? "border-primary/20 bg-folder-2 text-foreground"
                : "border-border bg-background text-foreground hover:bg-surface-2",
            )}
            key={preset}
            onClick={() => choosePreset(preset)}
            type="button"
          >
            {t(
              `materialsLanding.filters.presets.${preset}`,
              PRESET_FALLBACK[preset],
            )}
          </button>
        ))}
      </div>

      {/*
        Stacked rather than side by side, for the same reason the बिगो fields are:
        a native date field renders a picker affordance next to its value, and two
        of them sharing a 250px sidebar truncate the date the reader just picked.
      */}
      <div className="mt-3 space-y-2">
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

      {/*
        The coverage caveat, and only while unfiltered — the same shape, and the
        same justification, as the बिगो note.

        A `range` clause cannot match a document with no date, so any bound
        silently drops the ones that have none. Nothing else on the page says so,
        and without it their disappearance reads as "there are no such documents"
        rather than "this filter cannot see them".
      */}
      {from === undefined && to === undefined && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {t(
            "archiveSearch.filters.dateNote",
            "Filtering by date includes only documents with a recorded date.",
          )}
        </p>
      )}
    </fieldset>
  );
}
