/**
 * The curated series registry for the /materials archive.
 *
 * A "series" is the public identity of one shelf a visitor browses ("CIAA annual
 * reports", "Kanun Patrika"), where the underlying tokens are ingestion details.
 *
 * It USED to be 1:1 with a `source` token, so a shelf's number was exactly the
 * /api/statistics/ `materials.by_source` count. That broke on the Office of the
 * Auditor General: all 228 of its documents carry one token, `official_report`,
 * and only 18 are annual reports — the rest are province audit reports, the
 * audit journal, audit bulletins and eleven other kinds. A shelf titled "annual
 * reports" was making a claim about 210 documents that was not true.
 *
 * So a series is now a `source` AND an optional document KIND within it (the
 * search `dataset_bucket` scope, carried from the ingesting corpus's own
 * classification). Several series may share a source; `seriesScope` builds the
 * search params and `seriesCount` does the arithmetic, and both are tested —
 * prefer them to reading the fields directly.
 *
 * The complement shelf (`kindExclude`) is stated as "everything this source
 * holds that the other shelves did not claim", NOT as a list of the remaining
 * kinds. Enumerating them would work until the upstream corpus mints a new one,
 * and then those documents would belong to no shelf at all, silently. As a
 * complement the shelves are a provable partition of whatever the source
 * actually contains.
 *
 * Counts do NOT live here — they are joined live from /api/statistics/ at
 * render time. This is a deliberately short, editorial list (the archive's
 * flagship publications); everything else — court orders, procurement
 * notices, news, the long tail — remains reachable through /search.
 *
 * Names and descriptions are content, not UI chrome, so they live here as
 * bilingual pairs (the API's BilingualText convention) rather than in the
 * i18n catalogues — one file owns a series' slug, tokens, tint and wording.
 */

import type { MaterialsMetrics } from "@/types/jds";
import type { ArchiveSearchParams } from "@/types/search";

export interface MaterialSeries {
  /** URL identity: /materials/?series=<slug>. Stable; changing one breaks links. */
  slug: string;
  /** The data-lake source token (statistics by_source / ?source= scope). */
  source: string;
  /**
   * Optional document KIND within the source (`dataset_bucket`). Present when
   * one source token holds several shelves' worth of document.
   */
  kind?: string;
  /**
   * The complement of its siblings: every document in `source` whose kind is
   * NOT one of these. Mutually exclusive with `kind`. A document carrying no
   * kind at all is NOT excluded, so it lands here rather than nowhere.
   */
  kindExclude?: readonly string[];
  /**
   * Folder tint 1–8 (see --folder-* in src/index.css). Not unique: there are
   * more shelves than tints. Keep repeats far apart in render order.
   */
  tint: number;
  name: { ne: string; en: string };
  description: { ne: string; en: string };
  /** The dominant document type in the series, shown on the folder card. */
  typeLabel: { ne: string; en: string };
}

export const MATERIAL_SERIES: readonly MaterialSeries[] = [
  {
    slug: "charge-sheets",
    source: "ag",
    tint: 2,
    name: { ne: "अभियोगपत्रहरू", en: "Charge sheets" },
    description: {
      ne: "भ्रष्टाचार मुद्दामा विशेष अदालतमा दायर भएका अभियोगपत्रहरू, महान्यायाधिवक्ताको कार्यालयबाट।",
      en: "Charge sheets filed at the Special Court in corruption cases, from the Office of the Attorney General.",
    },
    typeLabel: { ne: "अभियोगपत्र", en: "Charge sheets" },
  },
  {
    slug: "ciaa-press-releases",
    source: "ciaa_press_release",
    tint: 5,
    name: { ne: "अख्तियारका प्रेस विज्ञप्ति", en: "CIAA press releases" },
    description: {
      ne: "अख्तियार दुरुपयोग अनुसन्धान आयोगले जारी गरेका प्रेस विज्ञप्तिहरू।",
      en: "Press releases issued by the Commission for the Investigation of Abuse of Authority.",
    },
    typeLabel: { ne: "प्रेस विज्ञप्ति", en: "Press releases" },
  },
  {
    slug: "kanun-patrika",
    source: "kanun_patrika",
    tint: 7,
    name: { ne: "कानुन पत्रिका", en: "Kanun Patrika" },
    description: {
      ne: "नेपाल कानुन पत्रिकाका पूर्ण अंकहरूको संग्रह।",
      en: "Full issues of the Nepal Kanun Patrika law journal.",
    },
    typeLabel: { ne: "पत्रिकाका अंक", en: "Journal issues" },
  },
  {
    slug: "ciaa-annual-reports",
    source: "ciaa_annual_report",
    tint: 3,
    name: { ne: "अख्तियारका वार्षिक प्रतिवेदन", en: "CIAA annual reports" },
    description: {
      ne: "अख्तियार दुरुपयोग अनुसन्धान आयोगका वार्षिक प्रतिवेदनहरू, आर्थिक वर्ष २०४७/४८ देखि।",
      en: "Annual reports of the CIAA, from fiscal year 2047/48 BS onward.",
    },
    typeLabel: { ne: "वार्षिक प्रतिवेदन", en: "Annual reports" },
  },
  // ---------------------------------------------------------------------
  // The Office of the Auditor General, five shelves over ONE source token.
  //
  // The slug `auditor-general-reports` keeps its meaning narrowed rather than
  // retired: it is a published identity, and it now shows what its title always
  // claimed. The four kinds named below plus the complement are a partition of
  // `official_report` — the counts must sum to its by_source total, which
  // `seriesCount` and its test depend on.
  // ---------------------------------------------------------------------
  {
    slug: "auditor-general-reports",
    source: "official_report",
    kind: "report_annual-report",
    tint: 4,
    name: { ne: "महालेखा परीक्षकका वार्षिक प्रतिवेदन", en: "Auditor General annual reports" },
    description: {
      ne: "महालेखा परीक्षकको कार्यालयले राष्ट्रपतिसमक्ष पेस गर्ने संघीय वार्षिक लेखापरीक्षण प्रतिवेदनहरू।",
      en: "The federal annual audit reports the Office of the Auditor General presents to the President.",
    },
    typeLabel: { ne: "वार्षिक प्रतिवेदन", en: "Annual reports" },
  },
  {
    slug: "province-audit-reports",
    source: "official_report",
    kind: "report_province-report",
    tint: 1,
    name: { ne: "प्रदेश लेखापरीक्षण प्रतिवेदन", en: "Province audit reports" },
    description: {
      ne: "सातै प्रदेशका सरकारी कार्यालयको लेखापरीक्षण गरी महालेखा परीक्षकको कार्यालयले तयार पारेका वार्षिक प्रतिवेदनहरू।",
      en: "The Auditor General's annual audit reports on the government offices of each of the seven provinces.",
    },
    typeLabel: { ne: "प्रदेश प्रतिवेदन", en: "Province reports" },
  },
  {
    slug: "audit-journal",
    source: "official_report",
    kind: "publication_audit-journals",
    tint: 6,
    name: { ne: "लेखापरीक्षण पत्रिका", en: "Audit journal" },
    description: {
      ne: "महालेखा परीक्षकको कार्यालयबाट प्रकाशित सरकारी लेखापरीक्षण पत्रिकाका अंकहरू।",
      en: "Issues of the Nepalese Journal of Government Auditing, published by the Office of the Auditor General.",
    },
    typeLabel: { ne: "पत्रिकाका अंक", en: "Journal issues" },
  },
  {
    slug: "audit-bulletin",
    source: "official_report",
    kind: "publication_audit-bulletin",
    tint: 8,
    name: { ne: "लेखापरीक्षण बुलेटिन", en: "Audit bulletin" },
    description: {
      ne: "महालेखा परीक्षकको कार्यालयको आवधिक लेखापरीक्षण बुलेटिनका अंकहरू।",
      en: "Issues of the Office of the Auditor General's periodic audit bulletin.",
    },
    typeLabel: { ne: "बुलेटिनका अंक", en: "Bulletin issues" },
  },
  {
    slug: "oag-publications",
    source: "official_report",
    // The complement of the four above. Stated as an exclusion so a kind this
    // registry has never heard of still lands somewhere — see the file header.
    kindExclude: [
      "report_annual-report",
      "report_province-report",
      "publication_audit-journals",
      "publication_audit-bulletin",
    ],
    // Repeats `charge-sheets`, the first card; this is the last. There are nine
    // shelves and eight tints.
    tint: 2,
    name: { ne: "महालेखा परीक्षकका अन्य प्रकाशन", en: "Other Auditor General publications" },
    description: {
      ne: "कार्यसम्पादन, सूचना प्रविधि, वातावरण र विशेष लेखापरीक्षण प्रतिवेदन, संस्थानको लेखापरीक्षण, सूचनाको हक सम्बन्धी प्रतिवेदन र अन्य प्रकाशनहरू।",
      en: "Performance, IT, environmental and special audit reports, corporate-body audits, right-to-information reports and other publications.",
    },
    typeLabel: { ne: "प्रतिवेदन र प्रकाशन", en: "Reports and publications" },
  },
];

/**
 * The search scope for one series: its source, plus its kind narrowing.
 *
 * Returned as params rather than read field-by-field at the call site so the
 * `kind` / `kindExclude` split has exactly one implementation.
 */
export function seriesScope(
  series: MaterialSeries,
): Pick<ArchiveSearchParams, "source" | "dataset_bucket" | "dataset_bucket_exclude"> {
  return {
    source: [series.source],
    ...(series.kind ? { dataset_bucket: [series.kind] } : {}),
    ...(series.kindExclude?.length
      ? { dataset_bucket_exclude: [...series.kindExclude] }
      : {}),
  };
}

/**
 * How many documents a series holds, from the /api/statistics/ materials block.
 *
 * Three shapes, because one source token can now carry several shelves:
 *  - no kind          → the whole token's `by_source` count (unchanged behaviour)
 *  - `kind`           → that (source, kind) row of `by_dataset_bucket`
 *  - `kindExclude`    → the token's total MINUS the excluded kinds' rows
 *
 * The complement is computed by subtraction rather than by summing the kinds it
 * does keep, so a kind this registry has never heard of is counted in "other"
 * instead of vanishing — the same reason the scope is an exclusion.
 *
 * Returns null while statistics are still loading, which the card renders as a
 * dash. An older API that does not send `by_dataset_bucket` yields 0 for a
 * kinded shelf rather than a wrong number.
 */
export function seriesCount(
  series: MaterialSeries,
  materials: MaterialsMetrics | undefined | null,
): number | null {
  if (!materials) return null;

  const sourceTotal =
    materials.by_source?.find((row) => row.source === series.source)?.count ?? 0;
  const buckets = materials.by_dataset_bucket ?? [];
  const bucketCount = (kind: string) =>
    buckets.find((row) => row.source === series.source && row.dataset_bucket === kind)
      ?.count ?? 0;

  if (series.kind) return bucketCount(series.kind);
  if (series.kindExclude?.length) {
    const claimed = series.kindExclude.reduce((sum, kind) => sum + bucketCount(kind), 0);
    // Clamp: a statistics snapshot older than the index could in principle make
    // the subtraction negative, and a card must never render "-3".
    return Math.max(0, sourceTotal - claimed);
  }
  return sourceTotal;
}

export function seriesBySlug(slug: string): MaterialSeries | undefined {
  return MATERIAL_SERIES.find((series) => series.slug === slug);
}

/**
 * The shelf a document belongs to, from its source AND its document kind.
 *
 * `kind` is not optional-for-convenience: once a source token carries several
 * shelves, source alone cannot answer this. Passing undefined for a document
 * that HAS a kind resolves to the complement shelf, which is wrong but honest —
 * "other publications" rather than a confident mislabel. Callers get the kind
 * from `extra.dataset_bucket` on a search hit, or `jawafdehi:datasetBucket` on a
 * fetched material.
 *
 * Resolution order matters. An exact kind match wins; then the complement shelf
 * for that source, if any; then a plain source-only shelf. Without the ordering
 * a kinded document would match whichever entry the registry happens to list
 * first — which is how 210 Auditor General documents would come back labelled
 * "annual reports".
 */
export function seriesBySource(
  source: string,
  kind?: string | null,
): MaterialSeries | undefined {
  const candidates = MATERIAL_SERIES.filter((series) => series.source === source);
  if (candidates.length <= 1) return candidates[0];

  if (kind) {
    const exact = candidates.find((series) => series.kind === kind);
    if (exact) return exact;
  }
  return (
    candidates.find(
      (series) =>
        series.kindExclude !== undefined &&
        (!kind || !series.kindExclude.includes(kind)),
    ) ?? candidates.find((series) => !series.kind && !series.kindExclude)
  );
}
