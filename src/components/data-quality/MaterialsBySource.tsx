import { useTranslation } from "react-i18next";

import type { MaterialsMetrics } from "@/types/jds";
import { sourceKeyFor } from "@/lib/material-source-labels";
import { materialTypeKeyFor } from "@/lib/material-type-labels";
import { MaterialsTable } from "./MaterialsTable";

/**
 * Two complementary evidence reads:
 *
 *  1. "Where the evidence comes from" — the original SOURCE each material traces
 *     back to (Attorney General charge sheets, Nepal Kanun Patrika precedents,
 *     court orders, CIAA releases, Jawafdehi originals...). Reads by_source.
 *  2. "What materials are hosted" — the same materials grouped by document TYPE
 *     (charge sheets, court order precedents, court orders...). Reads by_type.
 *
 * Source and type are different axes: "Charge Sheets" / "Court Order Precedents"
 * are material TYPES (chart 2); the SOURCES they come from are the Attorney
 * General (`ag`) and Nepal Kanun Patrika (`nkp`) in chart 1. Raw tokens are
 * mapped to plain labels via the two label mappers.
 *
 * Reads live materials.by_source / by_type from /api/statistics/.
 */
export function MaterialsBySource({ materials }: { materials?: MaterialsMetrics }) {
  const { t } = useTranslation();
  if (!materials) return null;

  // Aggregate counts by resolved key so multiple unmapped tokens collapse into
  // one "Other" bar instead of colliding React keys / duplicate rows. The
  // "jawafdehi" source (case-attached uploads) is excluded here — it conflated
  // documents we already hold elsewhere and read as confusing on this chart.
  const sourceItems = aggregate(
    (materials.by_source ?? []).filter((row) => row.source !== "jawafdehi"),
    (row) => sourceKeyFor(row.source),
    (key) => t(`dataQuality.materialsBySource.source.${key}`, key),
  );
  const typeItems = aggregate(
    materials.by_type ?? [],
    (row) => materialTypeKeyFor(row.material_type),
    (key) => t(`dataQuality.materialsByType.type.${key}`, key),
  );

  if (!sourceItems.length && !typeItems.length) return null;

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.materialsBySource.heading", "Where the evidence comes from")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.materialsBySource.description",
          "Every one of the {{total}} source materials traces back to a public office or record. This is where they originate.",
          { total: materials.total.toLocaleString() },
        )}
      </p>
      {sourceItems.length > 0 && (
        <div className="mt-6">
          <MaterialsTable
            items={sourceItems}
            nameHeader={t("dataQuality.materialsBySource.table.source", "Source")}
          />
        </div>
      )}

      {typeItems.length > 0 && (
        <div className="mt-10">
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground md:text-xl">
            {t("dataQuality.materialsByType.heading", "What materials are hosted")}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t(
              "dataQuality.materialsByType.description",
              "The same {{total}} materials, grouped by the kind of document they are.",
              { total: materials.total.toLocaleString() },
            )}
          </p>
          <div className="mt-6">
            <MaterialsTable
              items={typeItems}
              nameHeader={t("dataQuality.materialsByType.table.type", "Document type")}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/** Roll raw rows up by a resolved key, summing counts, into labeled bar items. */
function aggregate<T extends { count: number }>(
  rows: T[],
  keyOf: (row: T) => string,
  labelOf: (key: string) => string,
): { label: string; count: number }[] {
  const byKey = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row);
    const count = row.count;
    byKey.set(key, (byKey.get(key) ?? 0) + count);
  }
  return [...byKey.entries()].map(([key, count]) => ({ label: labelOf(key), count }));
}
