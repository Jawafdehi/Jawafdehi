import { useTranslation } from "react-i18next";

import type { MaterialsMetrics } from "@/types/jds";
import { sourceKeyFor } from "@/lib/material-source-labels";
import { materialTypeKeyFor } from "@/lib/material-type-labels";
import { MaterialsTable, type MaterialsSourceGroup } from "./MaterialsTable";

/**
 * "Where the evidence comes from" — one institution-centric table over the
 * materials dataset. Each row is a document type, grouped under the public
 * office/record it traces back to (Office of the Attorney General, Nepal Courts,
 * CIAA, Nepal Kanun Patrika...). An institution that publishes more than one kind
 * of document (CIAA → press releases AND annual reports) gets one row per type,
 * each with its own count, under a single spanning source cell.
 *
 * The raw `by_source` tokens name the record, not the institution, and split one
 * office across several tokens (CIAA press releases vs annual reports). So we
 * roll sources up by `sourceKeyFor` into publishing institutions, and read the
 * per-type counts from the `by_source_type` cross-tab (`GROUP BY source,
 * material_type`). Types are named via `materialTypeKeyFor`.
 *
 * The `jawafdehi` source (case-attached uploads) is excluded: it conflates
 * documents already held under other sources and reads as confusing here.
 *
 * Reads live materials.by_source_type from /api/statistics/ (falls back to
 * by_source, with no per-type rows, for pre-cross-tab snapshots).
 */
export function MaterialsBySource({ materials }: { materials?: MaterialsMetrics }) {
  const { t } = useTranslation();
  if (!materials) return null;

  const groups = buildInstitutionGroups(materials, t);
  if (!groups.length) return null;

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.materialsBySource.heading", "Where the evidence comes from")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.materialsBySource.description",
          "Every one of the {{total}} source materials traces back to a public office or record. This is where they originate — and the kind of document each office contributes.",
          { total: materials.total.toLocaleString() },
        )}
      </p>
      <div className="mt-6">
        <MaterialsTable groups={groups} />
      </div>
    </section>
  );
}

/**
 * Roll materials up by publishing institution, keeping each document type a
 * separate row within the institution. Prefers the by_source_type cross-tab;
 * falls back to by_source (one type-less row per institution) when an older
 * snapshot lacks the cross-tab.
 */
function buildInstitutionGroups(
  materials: MaterialsMetrics,
  t: (key: string, fallback: string) => string,
): MaterialsSourceGroup[] {
  const crossTab = (materials.by_source_type ?? []).filter(
    (row) => row.source !== "jawafdehi",
  );

  // key -> (typeKey -> count)
  const byKey = new Map<string, Map<string, number>>();

  if (crossTab.length > 0) {
    for (const row of crossTab) {
      const key = sourceKeyFor(row.source);
      const typeCounts = byKey.get(key) ?? new Map();
      const typeKey = materialTypeKeyFor(row.material_type);
      typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + row.count);
      byKey.set(key, typeCounts);
    }
  } else {
    // Fallback: no cross-tab — one type-less row per institution.
    for (const row of (materials.by_source ?? []).filter((r) => r.source !== "jawafdehi")) {
      const key = sourceKeyFor(row.source);
      const typeCounts = byKey.get(key) ?? new Map();
      typeCounts.set("", (typeCounts.get("") ?? 0) + row.count);
      byKey.set(key, typeCounts);
    }
  }

  return [...byKey.entries()].map(([key, typeCounts]) => ({
    key,
    source: t(`dataQuality.materialsBySource.source.${key}`, key),
    // Each document type its own row, biggest contributor first.
    rows: [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([typeKey, count]) => ({
        key: typeKey || "all",
        type: documentTypeLabel(key, typeKey, t),
        count,
      })),
  }));
}

// Sources whose materials land under the generic `document` type but whose real
// output is specific enough to name (researched from each office's mandate):
// DFMIS = development-finance records, PPMO = contractor blacklist/debarment
// records, Koshi = provincial records, CIAA = annual reports, Nepal Courts =
// filings (submissions *to* a court, as against the 23k orders issued *by* one),
// NKP = the bound monthly issues of the law journal. For these, a bare
// "Documents" row is unhelpful, so we substitute the office's actual output.
//
// Naming rather than folding these into the institution's main row is deliberate.
// NKP's 220 issues are the volumes its 10,468 individual precedents were
// published in — containers, not peers — so summing them would count the same
// content twice and overstate the precedent corpus. Nepal Courts' filings are a
// different document class from its orders. Small counts here mean "rare kind of
// record", not "rounding error".
//
// Safe for the multi-type institutions because each one contributes exactly one
// generically-typed raw source: CIAA's press releases arrive typed as
// `press_release` and only `ciaa_annual_report` falls through as `document`;
// likewise `court_filing` under courts and `kanun_patrika` under nkp. If a second
// generic source is ever folded into one of these keys, its rows would wrongly
// inherit this label — name the type at the source instead.
const SOURCE_PUBLISHES = new Set(["dfmis", "ppmo", "koshi", "ciaa", "courts", "nkp"]);
const GENERIC_TYPE_KEYS = new Set(["document", "other"]);

/**
 * Label a document-type row. Uses the data-driven material-type label, except
 * where a source only carries the generic `document` type — then it names what
 * that specific office publishes (via the source's `publishes` string).
 */
function documentTypeLabel(
  sourceKey: string,
  typeKey: string,
  t: (key: string, fallback: string) => string,
): string {
  if (!typeKey) return "";
  if (GENERIC_TYPE_KEYS.has(typeKey) && SOURCE_PUBLISHES.has(sourceKey)) {
    return t(`dataQuality.materialsBySource.publishes.${sourceKey}`, `publishes.${sourceKey}`);
  }
  return t(`dataQuality.materialsByType.type.${typeKey}`, typeKey);
}
