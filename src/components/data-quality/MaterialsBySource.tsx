import { useTranslation } from "react-i18next";

import type { MaterialsMetrics } from "@/types/jds";
import { sourceKeyFor } from "@/lib/material-source-labels";
import { BreakdownBar } from "./BreakdownBar";

/**
 * "Where the evidence comes from." Every material in the archive traces to one
 * of these public feeds (court orders, CIAA releases, DFMIS...). Raw source
 * tokens are mapped to plain labels.
 *
 * Reads live materials.by_source from /api/statistics/ (no mock).
 */
export function MaterialsBySource({ materials }: { materials?: MaterialsMetrics }) {
  const { t } = useTranslation();
  if (!materials?.by_source?.length) return null;

  const items = materials.by_source.map((row) => ({
    label: t(`dataQuality.materialsBySource.source.${sourceKeyFor(row.source)}`, row.source),
    count: row.count,
  }));

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.materialsBySource.heading", "Where the evidence comes from")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.materialsBySource.description",
          "Every one of the {{total}} source materials is pulled from a public feed. This is the mix.",
          { total: materials.total.toLocaleString() },
        )}
      </p>

      <div className="mt-6">
        <BreakdownBar
          items={items}
          labelWidth={180}
          tooltipLabel={t("dataQuality.materialsBySource.tooltip", "Materials")}
        />
      </div>
    </section>
  );
}
