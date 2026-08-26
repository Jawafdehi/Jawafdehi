/**
 * The curated series registry for the /materials archive.
 *
 * A "series" is the public identity of one `source` token from the data lake:
 * the unit a visitor browses ("CIAA annual reports", "NKP precedents"), where
 * the raw token is an ingestion detail. The registry is deliberately 1:1 with
 * source tokens so every number shown for a series is exactly the
 * /api/statistics/ `materials.by_source` count for that token, and the series
 * browse (`/api/materials/?source=…`) shows exactly the documents counted.
 *
 * Counts do NOT live here — they are joined live from /api/statistics/ at
 * render time. A series whose token returns no count is not rendered.
 * Long-tail tokens (one-off uploads, misc sub-sources) are intentionally
 * absent; those documents remain reachable through /search.
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
  /** Folder tint 1–8 (see --folder-* in src/index.css); cycles past 8. */
  tint: number;
  name: { ne: string; en: string };
  description: { ne: string; en: string };
  /** The dominant document type in the series, shown on the folder card. */
  typeLabel: { ne: string; en: string };
}

export const MATERIAL_SERIES: readonly MaterialSeries[] = [
  {
    slug: "bolpatra",
    source: "bolpatra",
    tint: 1,
    name: { ne: "सार्वजनिक खरिद सूचना", en: "Public procurement notices" },
    description: {
      ne: "नेपालको विद्युतीय खरिद प्रणाली (बोलपत्र) मा प्रकाशित सार्वजनिक खरिद सूचनाहरूको संग्रह।",
      en: "Public procurement notices published on Bolpatra, Nepal's electronic procurement portal.",
    },
    typeLabel: { ne: "खरिद सूचना", en: "Procurement notices" },
  },
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
    slug: "court-orders",
    source: "court_order",
    tint: 3,
    name: { ne: "अदालतका आदेश तथा फैसला", en: "Court orders & verdicts" },
    description: {
      ne: "नेपालका अदालतहरूले जारी गरेका आदेश, फैसला र निर्णयहरूको अभिलेख।",
      en: "Orders, verdicts and decisions issued by Nepal's courts.",
    },
    typeLabel: { ne: "अदालती आदेश", en: "Court orders" },
  },
  {
    slug: "nkp-precedents",
    source: "nkp",
    tint: 4,
    name: { ne: "नेपाल कानुन पत्रिका — नजिर", en: "NKP precedents" },
    description: {
      ne: "नेपाल कानुन पत्रिकामा प्रकाशित सर्वोच्च अदालतका नजिरहरू।",
      en: "Supreme Court precedents published in the Nepal Kanun Patrika law reports.",
    },
    typeLabel: { ne: "नजिर", en: "Precedents" },
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
    slug: "dfmis",
    source: "dfmis",
    tint: 6,
    name: { ne: "विकास वित्त कागजात (DFMIS)", en: "Development-finance records" },
    description: {
      ne: "विकास वित्त व्यवस्थापन सूचना प्रणाली (DFMIS) का परियोजना तथा सहायता कागजातहरू।",
      en: "Project and aid records from the Development Finance Management Information System (DFMIS).",
    },
    typeLabel: { ne: "परियोजना कागजात", en: "Project records" },
  },
  {
    slug: "kanun-patrika",
    source: "kanun_patrika",
    tint: 7,
    name: { ne: "कानुन पत्रिकाका अंक", en: "Kanun Patrika issues" },
    description: {
      ne: "नेपाल कानुन पत्रिकाका पूर्ण अंकहरूको संग्रह।",
      en: "Full issues of the Nepal Kanun Patrika law journal.",
    },
    typeLabel: { ne: "पत्रिकाका अंक", en: "Journal issues" },
  },
  {
    slug: "news",
    source: "news",
    tint: 8,
    name: { ne: "समाचार सामग्री", en: "News coverage" },
    description: {
      ne: "भ्रष्टाचार र सुशासनसम्बन्धी समाचार सामग्री, प्रमाणका रूपमा अभिलेख गरिएको।",
      en: "News coverage of corruption and governance, archived as evidence.",
    },
    typeLabel: { ne: "समाचार", en: "News" },
  },
  {
    slug: "ppmo",
    source: "ppmo",
    tint: 1,
    name: { ne: "सार्वजनिक खरिद अनुगमन कार्यालय", en: "PPMO records" },
    description: {
      ne: "सार्वजनिक खरिद अनुगमन कार्यालयका कालोसूची र प्रतिबन्धसम्बन्धी आधिकारिक अभिलेखहरू।",
      en: "Official blacklist and debarment records from the Public Procurement Monitoring Office.",
    },
    typeLabel: { ne: "आधिकारिक प्रतिवेदन", en: "Official reports" },
  },
  {
    slug: "cib-press-releases",
    source: "cib",
    tint: 2,
    name: { ne: "केन्द्रीय अनुसन्धान ब्युरोका विज्ञप्ति", en: "CIB press releases" },
    description: {
      ne: "नेपाल प्रहरी केन्द्रीय अनुसन्धान ब्युरोले जारी गरेका प्रेस विज्ञप्तिहरू।",
      en: "Press releases issued by the Nepal Police Central Investigation Bureau.",
    },
    typeLabel: { ne: "प्रेस विज्ञप्ति", en: "Press releases" },
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
    slug: "laws-of-nepal",
    source: "legal_corpus",
    tint: 4,
    name: { ne: "नेपालका कानुनहरू", en: "Laws of Nepal" },
    description: {
      ne: "ऐन, नियमावली र विधेयकहरूको संग्रह।",
      en: "A collection of Nepali statutes, regulations and bills.",
    },
    typeLabel: { ne: "कानुन तथा ऐन", en: "Laws & legislation" },
  },
];

export function seriesBySlug(slug: string): MaterialSeries | undefined {
  return MATERIAL_SERIES.find((series) => series.slug === slug);
}

export function seriesBySource(source: string): MaterialSeries | undefined {
  return MATERIAL_SERIES.find((series) => series.source === source);
}
