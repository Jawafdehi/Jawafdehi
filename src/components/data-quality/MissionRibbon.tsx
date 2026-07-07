import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { formatFreshness } from "@/lib/data-quality";

/**
 * A quiet trust strip under the page header: one line on what this page is,
 * and when the underlying data was last refreshed. Deliberately low-key — a
 * signal, not a hero.
 */
export function MissionRibbon({
  lastUpdated,
  showFreshness = true,
}: {
  lastUpdated?: string | null;
  /** Hidden for sample-data previews, where a "last refreshed" time would be fabricated. */
  showFreshness?: boolean;
}) {
  const { t } = useTranslation();
  const freshness = showFreshness ? formatFreshness(lastUpdated) : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        {t(
          "dataQuality.ribbon.explainer",
          "An open account of what we've documented, where it comes from, and how far each case has travelled toward accountability.",
        )}
      </p>
      {freshness && (
        <p className="flex shrink-0 items-center gap-1.5 font-medium text-foreground/80">
          <RefreshCw className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {t("dataQuality.ribbon.refreshed", "Data last refreshed {{ago}}", {
            ago: freshness,
          })}
        </p>
      )}
    </div>
  );
}
