/**
 * The curated series registry for the /materials archive.
 *
 * A "series" is the public identity of one `source` token from the data lake:
 * the unit a visitor browses ("CIAA annual reports", "Kanun Patrika"), where
 * the raw token is an ingestion detail. The registry is deliberately 1:1 with
 * source tokens so every number shown for a series is exactly the
 * /api/statistics/ `materials.by_source` count for that token, and the series
 * browse (`/api/materials/?source=…`) shows exactly the documents counted.
 *
 * Counts do NOT live here — they are joined live from /api/statistics/ at
 * render time. This is a deliberately short, editorial list (the archive's
 * flagship publications); everything else — court orders, procurement
 * notices, news, the long tail — remains reachable through /search.
 *
 * Names and descriptions are content, not UI chrome, so they live here as
 * bilingual pairs (the API's BilingualText convention) rather than in the
 * i18n catalogues — one file owns a series' slug, token, tint and wording.
 */

export interface MaterialSeries {
  /** URL identity: /materials/?series=<slug>. Stable; changing one breaks links. */
  slug: string;
  /** The data-lake source token (statistics by_source / ?source= filter). */
  source: string;
  /** Folder tint 1–8 (see --folder-* in src/index.css). */
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
  {
    slug: "auditor-general-reports",
    source: "official_report",
    tint: 4,
    name: { ne: "महालेखा परीक्षकका वार्षिक प्रतिवेदन", en: "Auditor General annual reports" },
    description: {
      ne: "महालेखा परीक्षकको कार्यालयका वार्षिक लेखापरीक्षण प्रतिवेदनहरू।",
      en: "Annual audit reports from the Office of the Auditor General.",
    },
    typeLabel: { ne: "लेखापरीक्षण प्रतिवेदन", en: "Audit reports" },
  },
];

export function seriesBySlug(slug: string): MaterialSeries | undefined {
  return MATERIAL_SERIES.find((series) => series.slug === slug);
}

export function seriesBySource(source: string): MaterialSeries | undefined {
  return MATERIAL_SERIES.find((series) => series.source === source);
}
