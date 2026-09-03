import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type MaterialDatePreset = "all" | "30-days" | "6-months" | "1-year" | "custom";

const PRESETS: readonly Exclude<MaterialDatePreset, "custom">[] = [
  "all",
  "30-days",
  "6-months",
  "1-year",
];

export interface MaterialFilters {
  preset: MaterialDatePreset;
  startDate: string;
  endDate: string;
  query: string;
}

interface MaterialFilterPanelProps {
  filters: MaterialFilters;
  invalidDateRange: boolean;
  activeFilterCount: number;
  onPresetChange: (preset: MaterialDatePreset) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClear: () => void;
  idPrefix?: string;
  className?: string;
}

export function MaterialFilterPanel({
  filters,
  invalidDateRange,
  activeFilterCount,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
  idPrefix = "materials-filter",
  className,
}: Readonly<MaterialFilterPanelProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "font-filter-panel overflow-hidden rounded-2xl border-0 bg-surface shadow-elev-md",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-5">
        <div>
          <h2 className="font-archive-section-title text-xl">
            {t("materialsLanding.filters.title", "Filter")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeFilterCount
              ? t("materialsLanding.filters.active", "{{count}} active", {
                  count: activeFilterCount,
                })
              : t("materialsLanding.filters.none", "No filters applied")}
          </p>
        </div>
        {activeFilterCount ? (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2.5 text-xs">
            {t("materialsLanding.filters.clear", "Clear")}
          </Button>
        ) : null}
      </div>

      <fieldset className="px-5 py-5">
        <legend className="sr-only">
          {t("materialsLanding.filters.dateRange", "Filter by date range")}
        </legend>
        <p className="mb-4 text-sm font-semibold text-foreground">
          {t("materialsLanding.filters.dateRange", "Filter by date range")}
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={filters.preset === preset}
              onClick={() => onPresetChange(preset)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                filters.preset === preset
                  ? "border-primary/20 bg-folder-2 text-foreground"
                  : "border-border bg-background text-foreground hover:bg-surface-2",
              )}
            >
              {t(`materialsLanding.filters.presets.${preset}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="px-5 py-5">
        <p className="mb-4 text-sm font-semibold text-foreground">
          {t("materialsLanding.filters.customRange", "Custom date range")}
        </p>
        <div className="grid gap-3">
          <div>
            <Label
              htmlFor={`${idPrefix}-start`}
              className="mb-2 block text-xs text-muted-foreground"
            >
              {t("materialsLanding.filters.startDate", "From date (AD)")}
            </Label>
            <div className="relative">
              <Input
                id={`${idPrefix}-start`}
                type="date"
                value={filters.startDate}
                max={filters.endDate || undefined}
                onChange={(event) => onStartDateChange(event.target.value)}
                className="h-11 rounded-xl [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>
          <div>
            <Label
              htmlFor={`${idPrefix}-end`}
              className="mb-2 block text-xs text-muted-foreground"
            >
              {t("materialsLanding.filters.endDate", "To date (AD)")}
            </Label>
            <div className="relative">
              <Input
                id={`${idPrefix}-end`}
                type="date"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(event) => onEndDateChange(event.target.value)}
                className="h-11 rounded-xl [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>
        </div>
        {invalidDateRange ? (
          <p role="alert" className="mt-3 text-xs font-medium text-destructive">
            {t("materialsLanding.filters.invalidRange", "The from date must be before the to date.")}
          </p>
        ) : null}
      </div>

    </div>
  );
}
