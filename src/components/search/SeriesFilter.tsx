import { useTranslation } from "react-i18next";

import { OptionList, RadioRow } from "@/components/search/filter-controls";
import { MATERIAL_SERIES } from "@/data/material-series";
import { useArchiveSeries } from "@/hooks/useArchiveSeries";
import { pickLocalized } from "@/lib/materials-landing";

/**
 * The Documents tab's Series filter: one shelf of the archive at a time (CIAA
 * charge sheets, the Auditor General's annual reports…), from the curated
 * registry the landing page's folders are drawn from. Single choice, because a
 * shelf is a scope, not a facet; choosing the selected one again clears it.
 */
export function SeriesFilter({
  value,
  onChange,
}: Readonly<{ value?: string; onChange: (slug: string | undefined) => void }>) {
  const { t, i18n } = useTranslation();
  // A folder opened from /materials can be a shelf leaf the curated list does
  // not carry (Laws · Acts); it leads the list, checked, so the filter in
  // force is always one the reader can see and clear.
  const inForce = useArchiveSeries(value);
  const offList = value && !MATERIAL_SERIES.some((series) => series.slug === value) ? inForce : undefined;
  const options = offList ? [offList, ...MATERIAL_SERIES] : MATERIAL_SERIES;
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-1.5 text-sm text-muted-foreground">
        {t("archiveSearch.filters.series", "Series")}
      </legend>
      <OptionList>
        {options.map((series) => {
          const checked = series.slug === value;
          return (
            <RadioRow key={series.slug} checked={checked} onClick={() => onChange(checked ? undefined : series.slug)}>
              <span className="block truncate">{pickLocalized(series.name, i18n.language)}</span>
            </RadioRow>
          );
        })}
      </OptionList>
    </fieldset>
  );
}
