/**
 * The archive as a folder tree: folder › office › series (JAW-65).
 *
 * One tree replaces both the curated series shelf and the flat every-source
 * list on /materials. Every name is a Nepali | English pair built from one
 * vocabulary (प्रतिवेदन | Reports, प्रेस विज्ञप्ति | Press releases, कारबाही |
 * Enforcement actions, …) so the page shows one language, never a mix.
 *
 * WHERE THINGS GO comes from the API (JAW-87): every row of
 * /api/document-sources/ carries the `folder` (and optional `subfolder`) its
 * source is filed under, and the response lists the folders themselves, in
 * display order with both names. So a source added through the registry lands
 * in its folder with no release. What stays here is presentation only: how a
 * source's documents are grouped into an office and named series
 * (`ARCHIVE_SHELVES`). A shelf goes in the folder of its sources; a source no
 * shelf mentions gets its own leaf in its folder, from its API row.
 *
 * Counts are never stored here: a leaf's count comes live from
 * /api/document-sources/ through `seriesCount`, and a folder's is the sum of
 * its leaves, so a folder and its contents cannot disagree.
 */

import {
  MATERIAL_SERIES,
  seriesBySlug,
  seriesCount,
  seriesSearchPath,
  type MaterialSeries,
} from "@/data/material-series";
import {
  listedSources,
  type BilingualLabel,
  type DocumentSourceEntry,
  type DocumentSourceFolder,
  type DocumentSourcesResponse,
} from "@/lib/document-sources";

export interface Bilingual {
  ne: string;
  en: string;
}

/** A series: one source token, optionally narrowed to a kind (or its complement). */
export interface ArchiveLeaf {
  type: "leaf";
  slug: string;
  name: Bilingual;
  source: string;
  kind?: string;
  kindExclude?: readonly string[];
  /** Filled for sources filed automatically from the API (no curated pair). */
  apiName?: BilingualLabel | null;
}

/** A folder, an office or a sub-group: anything that holds other nodes. */
export interface ArchiveBranch {
  type: "branch";
  slug: string;
  name: Bilingual;
  tint: number;
  children: ArchiveNode[];
}

export type ArchiveNode = ArchiveLeaf | ArchiveBranch;

const curated = (slug: string, name: Bilingual): ArchiveLeaf => {
  const series = MATERIAL_SERIES.find((entry) => entry.slug === slug);
  if (!series) throw new Error(`archive-folders: unknown curated series ${slug}`);
  return {
    type: "leaf",
    slug,
    name,
    source: series.source,
    ...(series.kind ? { kind: series.kind } : {}),
    ...(series.kindExclude ? { kindExclude: series.kindExclude } : {}),
  };
};

const leaf = (
  slug: string,
  source: string,
  name: Bilingual,
  scope: { kind?: string; kindExclude?: readonly string[] } = {},
): ArchiveLeaf => ({ type: "leaf", slug, source, name, ...scope });

const branch = (slug: string, name: Bilingual, tint: number, children: ArchiveNode[]): ArchiveBranch => ({
  type: "branch",
  slug,
  name,
  tint,
  children,
});

// One word per concept, everywhere.
const W = {
  annualReports: { ne: "वार्षिक प्रतिवेदन", en: "Annual reports" },
  pressReleases: { ne: "प्रेस विज्ञप्ति", en: "Press releases" },
  chargeSheets: { ne: "अभियोगपत्र", en: "Charge sheets" },
  chargeSheetsUploads: { ne: "अभियोगपत्र (मुद्दासँग अपलोड गरिएका)", en: "Charge sheets (case uploads)" },
  reports: { ne: "प्रतिवेदन", en: "Reports" },
  enforcement: { ne: "कारबाही", en: "Enforcement actions" },
  publications: { ne: "प्रकाशन", en: "Publications" },
  judgments: { ne: "फैसला", en: "Judgments" },
  reportsAndPressReleases: { ne: "प्रतिवेदन र प्रेस विज्ञप्ति", en: "Reports and press releases" },
  attendance: { ne: "उपस्थिति विवरण", en: "Attendance records" },
  other: { ne: "अन्य", en: "Other" },
} as const;

/**
 * The standard sub-folders of every Parliament committee (a source whose key
 * is `parliament_<committee>` or `parliament_na_<committee>`), so a newly
 * loaded committee is split by kind with no edit here. Each `kind` is the
 * `jawafdehi:datasetBucket` the sourcing agent sets on the document; the same
 * values serve every committee, because a leaf is always scoped to its own
 * source as well. The last entry is the complement: a document with no kind,
 * or one not listed here, lands in "Other". The `key` is part of the leaf's
 * slug (`<source>--<key>`), so changing one breaks links.
 *
 * KEEP IN SYNC with the API's committee series labels (JawafdehiAPI
 * `materials/sources.py`, COMMITTEE_SERIES_LABELS) and the sourcing agent's
 * kind list (bhandari-workspace/batches/KINDS.md).
 */
export const COMMITTEE_TEMPLATE: readonly { key: string; name: Bilingual; kind?: string }[] = [
  { key: "annual-reports", name: W.annualReports, kind: "committee-annual-report" },
  {
    key: "meeting-decisions",
    name: { ne: "बैठकका निर्णय र निर्देशन", en: "Meeting decisions and directives" },
    kind: "committee-meeting-decisions",
  },
  {
    key: "inquiry-reports",
    name: { ne: "उपसमिति, छानबिन तथा अध्ययन प्रतिवेदन", en: "Sub-committee, inquiry and study reports" },
    kind: "committee-inquiry-report",
  },
  { key: "bill-reports", name: { ne: "विधेयकसम्बन्धी प्रतिवेदन", en: "Reports on bills" }, kind: "committee-bill-report" },
  { key: "press-releases", name: W.pressReleases, kind: "committee-press-release" },
  { key: "attendance", name: W.attendance, kind: "committee-attendance" },
  { key: "other", name: W.other },
];

/** Every named committee kind: what the "Other" sub-folder leaves out. */
export const COMMITTEE_KINDS: readonly string[] = COMMITTEE_TEMPLATE.flatMap((entry) => (entry.kind ? [entry.kind] : []));

/** The name the complement takes when a committee has nothing else to split off. */
const COMMITTEE_ALL: Bilingual = { ne: "सबै कागजात", en: "All documents" };

/**
 * A committee source: `parliament_` plus a lowercase snake-case name. The
 * narrow alphabet is what keeps `<source>--<key>` a path-safe, reversible slug.
 */
const COMMITTEE_SOURCE = /^parliament_[a-z0-9_]+$/;
const COMMITTEE_SLUG = /^(parliament_[a-z0-9_]+)--([a-z-]+)$/;

export function isCommitteeSource(source: string): boolean {
  return COMMITTEE_SOURCE.test(source);
}

/** One sub-folder of a committee, from the template. */
function committeeLeaf(source: string, entry: (typeof COMMITTEE_TEMPLATE)[number]): ArchiveLeaf {
  return {
    type: "leaf",
    slug: `${source}--${entry.key}`,
    source,
    name: entry.name,
    ...(entry.kind ? { kind: entry.kind } : { kindExclude: COMMITTEE_KINDS }),
  };
}

/** A committee sub-folder by its slug (`parliament_finance--annual-reports`), catalogue or not. */
export function committeeLeafBySlug(slug: string): ArchiveLeaf | undefined {
  const match = COMMITTEE_SLUG.exec(slug);
  if (!match) return undefined;
  // A committee with its own shelf (the PAC) keeps its own leaves only.
  if (ARCHIVE_SHELVES.flatMap(leavesOf).some((entry) => entry.source === match[1])) return undefined;
  const entry = COMMITTEE_TEMPLATE.find((candidate) => candidate.key === match[2]);
  return entry ? committeeLeaf(match[1], entry) : undefined;
}

const HOUSE_OFFICE_SLUG = "house-of-representatives";
const HOUSE_OFFICE: Bilingual = { ne: "प्रतिनिधि सभा", en: "House of Representatives" };

const NRB_KINDS = [
  "enforcement-action",
  "nrb-annual-report",
  "bank-supervision-report",
  "fisd-supervision-report",
  "fiu-annual-report",
] as const;

const LAW_KINDS = [
  "law-constitution",
  "law-act",
  "law-ordinance",
  "law-bill",
  "law-regulation",
  "law-procedure",
  "court-rules",
] as const;

const PAC_KINDS = ["pac-annual-report", "pac-meeting-decisions", "pac-subcommittee-report", "pac-attendance"] as const;

/**
 * The office and series shelves, in no particular order: each lands in the
 * folder the API files its sources under, and every level below the top folders
 * is sorted for display by `sortTree`. A section comment says where a shelf's
 * sources are filed today, for readers only.
 */
export const ARCHIVE_SHELVES: readonly ArchiveNode[] = [
  // Judiciary
  branch("supreme-court", { ne: "सर्वोच्च अदालत", en: "Supreme Court" }, 2, [
    leaf("supreme-court-precedents", "nkp", { ne: "नजिर", en: "Precedents" }),
    leaf("supreme-court-annual-reports", "judiciary_report", W.annualReports, {
      kindExclude: ["judicial-council-annual-report", "special-court-annual-report"],
    }),
  ]),
  curated("kanun-patrika", { ne: "नेपाल कानुन पत्रिका", en: "Nepal Kanoon Patrika" }),
  branch("special-court", { ne: "विशेष अदालत", en: "Special Court" }, 2, [
    leaf("special-court-judgments", "special_court_order", W.judgments),
    leaf("special-court-annual-reports", "judiciary_report", W.annualReports, {
      kind: "special-court-annual-report",
    }),
  ]),
  branch("judicial-council", { ne: "न्याय परिषद्", en: "Judicial Council" }, 2, [
    leaf("judicial-council-annual-reports", "judiciary_report", W.annualReports, {
      kind: "judicial-council-annual-report",
    }),
  ]),
  leaf("court-orders", "court_order", { ne: "अदालती आदेश", en: "Court orders" }),
  leaf("court-filings", "court_filing", { ne: "अदालतमा दायर निवेदन", en: "Court filings" }),

  // Government bodies
  branch("ciaa", { ne: "अख्तियार दुरुपयोग अनुसन्धान आयोग", en: "Commission for the Investigation of Abuse of Authority" }, 1, [
    curated("ciaa-press-releases", W.pressReleases),
    curated("ciaa-annual-reports", W.annualReports),
  ]),
  branch("attorney-general", { ne: "महान्यायाधिवक्ताको कार्यालय", en: "Office of the Attorney General" }, 5, [
    curated("charge-sheets", W.chargeSheets),
    leaf("charge-sheets-uploads", "charge_sheet", W.chargeSheetsUploads),
    leaf("attorney-general-annual-reports", "attorney_general_report", W.annualReports),
  ]),
  branch("auditor-general", { ne: "महालेखापरीक्षकको कार्यालय", en: "Office of the Auditor General" }, 3, [
    curated("auditor-general-reports", W.annualReports),
    curated("province-audit-reports", { ne: "प्रदेश लेखापरीक्षण प्रतिवेदन", en: "Provincial audit reports" }),
    curated("audit-journal", { ne: "लेखापरीक्षण जर्नल", en: "Audit journal" }),
    curated("audit-bulletin", { ne: "लेखापरीक्षण बुलेटिन", en: "Audit bulletin" }),
    curated("oag-publications", { ne: "अन्य प्रकाशन", en: "Other publications" }),
  ]),
  branch("opmcm", { ne: "प्रधानमन्त्री तथा मन्त्रिपरिषद्को कार्यालय", en: "Office of the Prime Minister and Council of Ministers" }, 4, [
    leaf("cabinet-decisions", "cabinet_decision", { ne: "मन्त्रिपरिषद्का निर्णय", en: "Cabinet decisions" }),
  ]),
  branch("ppmo", { ne: "सार्वजनिक खरिद अनुगमन कार्यालय", en: "Public Procurement Monitoring Office" }, 6, [
    leaf("tender-notices", "bolpatra", { ne: "बोलपत्र सूचना (विद्युतीय खरिद प्रणाली)", en: "Tender notices (electronic procurement)" }),
    leaf("ppmo-publications", "ppmo", W.publications),
    leaf("ppmo-blacklist", "ppmo_blacklist", { ne: "कालोसूची", en: "Blacklist" }),
  ]),
  branch("finance-ministry", { ne: "अर्थ मन्त्रालय", en: "Ministry of Finance" }, 7, [
    leaf("project-financing", "dfmis", { ne: "विकास आयोजना वित्तीय विवरण", en: "Project financing records" }),
  ]),
  branch("dri", { ne: "राजस्व अनुसन्धान विभाग", en: "Department of Revenue Investigation" }, 8, [
    leaf("dri-releases-reports", "dri", { ne: "प्रेस विज्ञप्ति र प्रतिवेदन", en: "Press releases and reports" }),
  ]),
  branch("dmli", { ne: "सम्पत्ति शुद्धीकरण अनुसन्धान विभाग", en: "Department of Money Laundering Investigation" }, 4, [
    leaf("dmli-press-releases", "dmli", W.pressReleases, { kind: "dmli-press-release" }),
    leaf("dmli-reports", "dmli", W.reports, { kindExclude: ["dmli-press-release"] }),
  ]),
  branch("nepal-police", { ne: "नेपाल प्रहरी", en: "Nepal Police" }, 6, [
    leaf("nepal-police-press-releases", "nepal_police", W.pressReleases),
  ]),
  branch("koshi-province", { ne: "कोशी प्रदेश", en: "Koshi Province" }, 2, [
    leaf("koshi-budget", "province/koshi", { ne: "बजेट विवरण", en: "Budget lines" }),
  ]),
  branch("home-ministry", { ne: "गृह मन्त्रालय", en: "Ministry of Home Affairs" }, 6, [
    leaf("home-ministry-documents", "moha", {
      ne: "प्रतिवेदन, निर्देशिका र प्रेस विज्ञप्ति",
      en: "Reports, directives and press releases",
    }),
  ]),
  branch("election-commission", { ne: "निर्वाचन आयोग", en: "Election Commission" }, 2, [
    leaf("election-commission-documents", "election_commission", {
      ne: "कागजात र प्रेस विज्ञप्ति",
      en: "Documents and press releases",
    }),
  ]),
  branch("nhrc", { ne: "राष्ट्रिय मानव अधिकार आयोग", en: "National Human Rights Commission" }, 4, [
    leaf("nhrc-reports-releases", "nhrc", W.reportsAndPressReleases),
  ]),
  branch("psc", { ne: "लोक सेवा आयोग", en: "Public Service Commission" }, 8, [
    leaf("psc-reports-releases", "psc", W.reportsAndPressReleases),
  ]),
  branch("trc", { ne: "सत्य निरुपण तथा मेलमिलाप आयोग", en: "Truth and Reconciliation Commission" }, 5, [
    leaf("trc-reports-notices", "trc", { ne: "प्रतिवेदन र सूचना", en: "Reports and notices" }),
  ]),
  branch("nea", { ne: "नेपाल विद्युत प्राधिकरण", en: "Nepal Electricity Authority" }, 7, [
    leaf("nea-reports-publications", "nea", { ne: "प्रतिवेदन र प्रकाशन", en: "Reports and publications" }),
  ]),
  // Government bodies › Regulators
  // nrb is split by kind (`jawafdehi:datasetBucket`, set when it was sourced);
  // a document with no kind lands in "Other reports".
  branch("nrb", { ne: "नेपाल राष्ट्र बैंक", en: "Nepal Rastra Bank" }, 3, [
    leaf("nrb-enforcement", "nrb", W.enforcement, { kind: "enforcement-action" }),
    leaf("nrb-annual-reports", "nrb", W.annualReports, { kind: "nrb-annual-report" }),
    leaf("nrb-bank-supervision-reports", "nrb", { ne: "बैंक सुपरिवेक्षण प्रतिवेदन", en: "Bank supervision reports" }, {
      kind: "bank-supervision-report",
    }),
    leaf(
      "nrb-financial-institution-supervision-reports",
      "nrb",
      { ne: "वित्तीय संस्था सुपरिवेक्षण प्रतिवेदन", en: "Financial institutions supervision reports" },
      { kind: "fisd-supervision-report" },
    ),
    leaf(
      "fiu-annual-reports",
      "nrb",
      {
        ne: "वित्तीय जानकारी इकाईका वार्षिक प्रतिवेदन (FIU-Nepal)",
        en: "Financial Information Unit (FIU-Nepal) annual reports",
      },
      { kind: "fiu-annual-report" },
    ),
    // Kept as "nrb-reports" so links from before the split still open.
    leaf("nrb-reports", "nrb", { ne: "अन्य प्रतिवेदन", en: "Other reports" }, { kindExclude: NRB_KINDS }),
  ]),
  branch("nta", { ne: "नेपाल दूरसञ्चार प्राधिकरण", en: "Nepal Telecommunications Authority" }, 2, [
    leaf("nta-reports-directives", "nta", { ne: "प्रतिवेदन र निर्देशिका", en: "Reports and directives" }),
  ]),
  branch("erc", { ne: "विद्युत नियमन आयोग", en: "Electricity Regulatory Commission" }, 6, [
    leaf("erc-reports-decisions", "erc", {
      ne: "प्रतिवेदन, निर्णय र निर्देशिका",
      en: "Reports, decisions and directives",
    }),
  ]),
  branch("sebon", { ne: "नेपाल धितोपत्र बोर्ड", en: "Securities Board of Nepal (SEBON)" }, 5, [
    leaf("sebon-enforcement", "sebon", W.enforcement),
  ]),
  branch("insurance-authority", { ne: "नेपाल बीमा प्राधिकरण", en: "Nepal Insurance Authority" }, 7, [
    leaf("insurance-enforcement", "nia", W.enforcement),
  ]),

  // Parliament
  // House of Representatives Public Accounts Committee, all three House terms
  // (2074, 2079, 2082) in one shelf. Kinds are `jawafdehi:datasetBucket`, set
  // when the documents were sourced; a document with no kind lands in "Other".
  // It sits under the House office, where every other House committee is
  // filed from its API publisher (with the committee template, below).
  branch(HOUSE_OFFICE_SLUG, HOUSE_OFFICE, 4, [
    branch("public-accounts-committee", { ne: "सार्वजनिक लेखा समिति", en: "Public Accounts Committee" }, 4, [
      leaf("pac-annual-reports", "parliament_pac", W.annualReports, { kind: "pac-annual-report" }),
      leaf("pac-meeting-decisions", "parliament_pac", { ne: "बैठकका निर्णय", en: "Meeting decisions" }, {
        kind: "pac-meeting-decisions",
      }),
      leaf("pac-subcommittee-reports", "parliament_pac", { ne: "उपसमितिका प्रतिवेदन", en: "Sub-committee reports" }, {
        kind: "pac-subcommittee-report",
      }),
      leaf("pac-attendance", "parliament_pac", W.attendance, {
        kind: "pac-attendance",
      }),
      leaf("pac-other", "parliament_pac", W.other, {
        kindExclude: PAC_KINDS,
      }),
    ]),
  ]),

  // Laws
  // legal_corpus split by kind (`jawafdehi:datasetBucket`, written by the
  // API's classify_legal_corpus). A document with no kind lands in "Other".
  branch("nepal-laws", { ne: "नेपालको कानुन", en: "Nepal's laws" }, 5, [
    leaf("constitution", "legal_corpus", { ne: "संविधान", en: "Constitution" }, { kind: "law-constitution" }),
    leaf("acts", "legal_corpus", { ne: "ऐन", en: "Acts" }, { kind: "law-act" }),
    leaf("ordinances", "legal_corpus", { ne: "अध्यादेश", en: "Ordinances" }, { kind: "law-ordinance" }),
    leaf("bills", "legal_corpus", { ne: "विधेयक", en: "Bills" }, { kind: "law-bill" }),
    leaf("regulations", "legal_corpus", { ne: "नियमावली", en: "Regulations" }, { kind: "law-regulation" }),
    leaf("procedures", "legal_corpus", { ne: "कार्यविधि र निर्देशिका", en: "Procedures and directives" }, {
      kind: "law-procedure",
    }),
    leaf("court-rules", "legal_corpus", { ne: "अदालती नियमावली", en: "Court rules" }, { kind: "court-rules" }),
    leaf("other-laws", "legal_corpus", { ne: "अन्य", en: "Other" }, {
      kindExclude: LAW_KINDS,
    }),
  ]),
  curated("legal-templates", { ne: "कानुनी ढाँचा", en: "Legal templates" }),
  // The Nepal Gazette (JAW-82). One series for now; it gains the gazette's own
  // volume › part › issue layout once that hierarchy is in the data.
  leaf("rajpatra", "rajpatra", { ne: "राजपत्र", en: "Nepal Rajpatra" }),

  // News
  leaf("news-articles", "news", { ne: "समाचार लेख", en: "News articles" }),
  leaf("ratopati", "ratopati", { ne: "रातोपाटी", en: "Ratopati" }),
  leaf("setopati", "news_setopati", { ne: "सेतोपाटी", en: "Setopati" }),
  leaf("shilapatra", "news_shilaptra", { ne: "शिलापत्र", en: "Shilapatra" }),
  leaf("occrp", "occrp", { ne: "संगठित अपराध तथा भ्रष्टाचार रिपोर्टिङ परियोजना (OCCRP)", en: "Organized Crime and Corruption Reporting Project (OCCRP)" }),
  leaf("social-media", "social_media", { ne: "सामाजिक सञ्जाल", en: "Social media posts" }),

  // International
  leaf("us-court-records", "us_court", { ne: "अमेरिकी संघीय अदालतका अभिलेख", en: "United States federal court records" }),
  leaf("us-sec-enforcement", "us_sec", { ne: "अमेरिकी धितोपत्र तथा विनिमय आयोगका कारबाही", en: "United States Securities and Exchange Commission enforcement actions" }),
  leaf("us-doj-agreements", "us_doj", { ne: "अमेरिकी न्याय विभागका सम्झौता", en: "United States Department of Justice agreements" }),

  // Others
  leaf("case-documents", "document", { ne: "मुद्दासम्बन्धी विविध कागजात", en: "Miscellaneous case documents" }),
];

export const UNFILED_FOLDER = "others";
const UNFILED_PREFIX = "source-";

/**
 * A path-safe slug for a source filed automatically. Source tokens can contain
 * "/" (`province/koshi`), and `?path=` joins slugs with "/", so every character
 * outside [a-z0-9_-] becomes "~" plus its code point: unique, and never a "/".
 */
export function unfiledSlug(source: string): string {
  return UNFILED_PREFIX + source.replace(/[^a-z0-9_-]/gi, (ch) => `~${ch.codePointAt(0)!.toString(16)}`);
}

function leavesOf(node: ArchiveNode): ArchiveLeaf[] {
  return node.type === "leaf" ? [node] : node.children.flatMap(leavesOf);
}


/**
 * The folders to draw before the catalogue arrives (and if a response ever
 * lacks `folders`): the API's vocabulary at the time of writing. The API's own
 * list wins whenever it is there.
 */
export const DEFAULT_FOLDERS: readonly DocumentSourceFolder[] = [
  { key: "judiciary", name: { ne: "न्यायपालिका", en: "Judiciary" } },
  {
    key: "government",
    name: { ne: "सरकारी निकाय", en: "Government bodies" },
    subfolders: [{ key: "regulators", name: { ne: "नियामक निकाय", en: "Regulators" } }],
  },
  { key: "parliament", name: { ne: "संघीय संसद", en: "Parliament" } },
  { key: "laws", name: { ne: "कानुन", en: "Laws" } },
  { key: "news", name: { ne: "समाचार", en: "News" } },
  { key: "international", name: { ne: "अन्तर्राष्ट्रिय", en: "International" } },
  { key: UNFILED_FOLDER, name: { ne: "अन्य", en: "Others" } },
];

/** Card tints per folder; presentation only. */
const FOLDER_TINT: Record<string, number> = {
  judiciary: 2,
  government: 1,
  regulators: 3,
  parliament: 4,
  laws: 5,
  news: 6,
  international: 7,
  [UNFILED_FOLDER]: 8,
};

const bilingual = (name: BilingualLabel | null | undefined, fallback: string): Bilingual => ({
  ne: name?.ne ?? "",
  en: name?.en || fallback,
});

/** Empty folder branches (with their sub-folder branches), in the API's order. */
function folderSkeleton(catalogue: DocumentSourcesResponse | undefined | null): ArchiveBranch[] {
  const vocabulary = catalogue?.folders?.length ? catalogue.folders : DEFAULT_FOLDERS;
  const folders = vocabulary.map((folder) => {
    const tint = FOLDER_TINT[folder.key] ?? FOLDER_TINT[UNFILED_FOLDER];
    return branch(
      folder.key,
      bilingual(folder.name, folder.key),
      tint,
      (folder.subfolders ?? []).map((sub) => branch(sub.key, bilingual(sub.name, sub.key), FOLDER_TINT[sub.key] ?? tint, [])),
    );
  });
  // Unfiled sources need somewhere to go even if a response leaves Others out.
  if (!folders.some((folder) => folder.slug === UNFILED_FOLDER)) {
    folders.push(branch(UNFILED_FOLDER, bilingual(DEFAULT_FOLDERS.at(-1)!.name, UNFILED_FOLDER), 8, []));
  }
  return folders;
}

type Placement = { folder: string; subfolder?: string | null };

/**
 * Where a shelf goes: the folder of the first of its sources the API files
 * (Others if the API gives none). A shelf with no source in the catalogue at
 * all is not drawn: there is nothing in it.
 */
function shelfPlacement(
  shelf: ArchiveNode,
  rows: ReadonlyMap<string, DocumentSourceEntry>,
): Placement | null {
  const sources = leavesOf(shelf).map((entry) => entry.source);
  const filed = sources.map((source) => rows.get(source)).find((row) => row?.folder);
  if (filed?.folder) return { folder: filed.folder, subfolder: filed.subfolder };
  return sources.some((source) => rows.has(source)) ? { folder: UNFILED_FOLDER } : null;
}

/**
 * Put `node` into its folder, and into the sub-folder when that folder has
 * one by that name; an unknown folder means Others. Sub-folders are the
 * branches a folder starts with, before any shelf is placed (`subfolders`).
 */
function place(
  tree: ArchiveBranch[],
  subfolders: ReadonlyMap<ArchiveBranch, readonly ArchiveBranch[]>,
  node: ArchiveNode,
  where: Placement,
): void {
  containerFor(tree, subfolders, where).children.push(node);
}

/** The folder (or its sub-folder) a placement names; an unknown folder means Others. */
function containerFor(
  tree: ArchiveBranch[],
  subfolders: ReadonlyMap<ArchiveBranch, readonly ArchiveBranch[]>,
  where: Placement,
): ArchiveBranch {
  const folder =
    tree.find((entry) => entry.slug === where.folder) ?? tree.find((entry) => entry.slug === UNFILED_FOLDER)!;
  const sub = where.subfolder
    ? subfolders.get(folder)?.find((entry) => entry.slug === where.subfolder)
    : undefined;
  return sub ?? folder;
}

/** A copy of a shelf whose branches can take extra leaves without touching `ARCHIVE_SHELVES`. */
function copyNode(node: ArchiveNode): ArchiveNode {
  return node.type === "branch" ? { ...node, children: node.children.map(copyNode) } : node;
}

// Country tails some publishers carry ("…, Nepal", "…, नेपाल सरकार"): the
// archive is all Nepal's, so an office is named without them. The same goes
// for ", Federal Parliament" on a House: it is already in the Parliament folder.
const OFFICE_TAIL_EN = /,\s*(Government of Nepal|Nepal|Federal Parliament(?: of Nepal)?)\s*$/i;
const OFFICE_TAIL_NE = /,\s*(नेपाल सरकार|नेपाल|संघीय संसद)\s*$/;

/**
 * The office a source not on any shelf is grouped under: its API publisher,
 * in both languages. Null when the API names no publisher.
 */
export function officeName(publisher: BilingualLabel | null | undefined): Bilingual | null {
  const en = (publisher?.en ?? "").trim().replace(OFFICE_TAIL_EN, "");
  const ne = (publisher?.ne ?? "").trim().replace(OFFICE_TAIL_NE, "");
  return en || ne ? { ne, en } : null;
}

/**
 * A source's name inside its office, without the office repeated in front
 * ("Ministry of Home Affairs reports" → "Reports"; "गृह मन्त्रालयका प्रतिवेदन"
 * → "प्रतिवेदन"). A name that doesn't start with the office stays whole.
 */
export function seriesName(name: BilingualLabel | null | undefined, office: Bilingual, source: string): Bilingual {
  const en = name?.en ?? "";
  const ne = name?.ne ?? "";
  let shortEn = en;
  if (office.en && en.toLowerCase().startsWith(`${office.en.toLowerCase()} `)) {
    const rest = en.slice(office.en.length + 1).trim();
    if (rest) shortEn = rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  let shortNe = ne;
  if (office.ne && ne.startsWith(office.ne)) {
    const rest = /^(?:का|को|की)?\s+(.+)$/.exec(ne.slice(office.ne.length));
    if (rest) shortNe = rest[1].trim();
  }
  return { ne: shortNe, en: shortEn || source };
}

function sameOffice(a: Bilingual, b: Bilingual): boolean {
  return (
    (Boolean(a.en) && a.en.toLowerCase() === b.en.toLowerCase()) || (Boolean(a.ne) && a.ne === b.ne)
  );
}

const OFFICE_PREFIX = "office-";

/**
 * A committee the shelves don't name, split into the standard sub-folders
 * (`COMMITTEE_TEMPLATE`). Once the counts are in, a sub-folder with nothing in
 * it is left out (a dozen committees would otherwise show rows of zeros), and
 * when nothing but the complement is left it is called "All documents", since
 * there is nothing for it to be "Other" than. Before then every sub-folder is
 * drawn. The branch keeps the slug the committee had as a single leaf, so a
 * link to it still opens it.
 */
function committeeBranch(
  row: DocumentSourceEntry,
  name: Bilingual,
  catalogue: DocumentSourcesResponse | undefined | null,
  tint: number,
): ArchiveBranch {
  const all = COMMITTEE_TEMPLATE.map((entry) => committeeLeaf(row.source, entry));
  const counted = all.filter((entry) => (seriesCount(leafSeries(entry), catalogue) ?? 1) > 0);
  const kept = counted.length ? counted : all.filter((entry) => entry.kindExclude);
  const children =
    kept.length === 1 && kept[0].kindExclude && catalogue?.ready ? [{ ...kept[0], name: COMMITTEE_ALL }] : kept;
  return branch(unfiledSlug(row.source), name, tint, children);
}

/** A path-safe slug for an office opened from the API publisher. */
export function officeSlug(office: Bilingual): string {
  const base = (office.en || office.ne).trim().toLowerCase().replace(/\s+/g, "-");
  return OFFICE_PREFIX + base.replace(/[^a-z0-9_-]/g, (ch) => `~${ch.codePointAt(0)!.toString(16)}`);
}

/**
 * The whole tree for one catalogue: the API's folders, every shelf in the
 * folder its sources are filed under, and every listed source no shelf
 * mentions as its own leaf in its folder (Others when the API gives none), so
 * a newly loaded source appears with no release. Empty sub-folders are dropped.
 */
export function withUnfiled(
  catalogue: DocumentSourcesResponse | undefined | null,
  language = "en",
): ArchiveBranch[] {
  const tree = folderSkeleton(catalogue);
  const subfolders = new Map(
    tree.map((folder) => [folder, folder.children.filter((child) => child.type === "branch")] as const),
  );
  const rows = new Map((catalogue?.sources ?? []).map((row) => [row.source, row] as const));
  for (const shelf of ARCHIVE_SHELVES) {
    const where = shelfPlacement(shelf, rows);
    if (where) place(tree, subfolders, copyNode(shelf), where);
  }
  const known = new Set(ARCHIVE_SHELVES.flatMap(leavesOf).map((entry) => entry.source));
  for (const row of listedSources(catalogue)) {
    if (known.has(row.source)) continue;
    const where = { folder: row.folder || UNFILED_FOLDER, subfolder: row.subfolder };
    const office = officeName(row.publisher);
    const name = office ? seriesName(row.name, office, row.source) : { ne: row.name?.ne ?? "", en: row.name?.en ?? row.source };
    const entry: ArchiveNode = isCommitteeSource(row.source)
      ? committeeBranch(row, name, catalogue, FOLDER_TINT[where.folder] ?? FOLDER_TINT[UNFILED_FOLDER])
      : { type: "leaf", slug: unfiledSlug(row.source), source: row.source, name, apiName: row.name };
    if (!office) {
      place(tree, subfolders, entry, where);
      continue;
    }
    // A source the shelves don't know still gets the office level: it joins
    // its publisher's office in that folder (a shelf's, or one an earlier
    // source opened), or opens one named after the publisher.
    const container = containerFor(tree, subfolders, where);
    const existing = container.children.find(
      (child): child is ArchiveBranch => child.type === "branch" && sameOffice(child.name, office),
    );
    if (existing) existing.children.push(entry);
    else container.children.push(branch(officeSlug(office), office, container.tint, [entry]));
  }
  // The top level keeps the API's fixed order (damo: Judiciary, Government
  // bodies, Laws, News, International, Others); everything below it is sorted.
  return tree.map((folder) => ({
    ...folder,
    children: sortTree(
      folder.children.filter(
        (child) => !(subfolders.get(folder)?.includes(child as ArchiveBranch) && child.type === "branch" && !child.children.length),
      ),
      language,
    ),
  }));
}

/** "Others" folders and "Other …" series always sort last. */
function isOther(node: ArchiveNode): boolean {
  return node.slug === UNFILED_FOLDER || /^other\b/i.test(node.name.en);
}

/**
 * Alphabetical in the language shown (Intl.Collator "ne" or "en"), so the
 * order follows the names the reader sees; "Other…" last. Used for every
 * level BELOW the top folders, which keep their fixed order.
 */
export function sortTree<T extends ArchiveNode>(nodes: readonly T[], language: string): T[] {
  const collator = new Intl.Collator(language?.startsWith("ne") ? "ne" : "en");
  return [...nodes]
    .map((node) => (node.type === "branch" ? ({ ...node, children: sortTree(node.children, language) } as T) : node))
    .sort(
      (a, b) =>
        Number(isOther(a)) - Number(isOther(b)) ||
        collator.compare(nodeName(a, language), nodeName(b, language)),
    );
}

/** A shelf leaf by slug, wherever (or whether) the catalogue files it; committee sub-folders included. */
export function shelfLeafBySlug(slug: string): ArchiveLeaf | undefined {
  return ARCHIVE_SHELVES.flatMap(leavesOf).find((entry) => entry.slug === slug) ?? committeeLeafBySlug(slug);
}

/** The leaf as a browsable series, for /materials/?series=<slug>. */
export function leafSeries(entry: ArchiveLeaf, tint = 1): MaterialSeries {
  const curatedSeries = MATERIAL_SERIES.find((series) => series.slug === entry.slug);
  if (curatedSeries) return curatedSeries;
  return {
    slug: entry.slug,
    source: entry.source,
    ...(entry.kind ? { kind: entry.kind } : {}),
    ...(entry.kindExclude ? { kindExclude: entry.kindExclude } : {}),
    tint,
    name: entry.name,
    description: { ne: "", en: "" },
    typeLabel: entry.name,
  };
}

/** A node's live document count; null while the catalogue is loading. */
export function nodeCount(node: ArchiveNode, catalogue: DocumentSourcesResponse | undefined | null): number | null {
  if (!catalogue?.ready) return null;
  return leavesOf(node).reduce((sum, entry) => sum + (seriesCount(leafSeries(entry), catalogue) ?? 0), 0);
}

/** The chain of nodes a slug path names (`judiciary/supreme-court`), or null. */
export function resolvePath(tree: readonly ArchiveBranch[], path: readonly string[]): ArchiveNode[] | null {
  const chain: ArchiveNode[] = [];
  let level: readonly ArchiveNode[] = tree;
  for (const slug of path) {
    const next = level.find((node) => node.slug === slug);
    if (!next) return null;
    chain.push(next);
    level = next.type === "branch" ? next.children : [];
  }
  return chain;
}

/** The chain of branches above the first leaf matching `match`, plus the leaf. */
export function findLeafChain(
  tree: readonly ArchiveBranch[],
  match: (entry: ArchiveLeaf) => boolean,
): ArchiveNode[] | null {
  const walk = (nodes: readonly ArchiveNode[], above: ArchiveNode[]): ArchiveNode[] | null => {
    for (const node of nodes) {
      if (node.type === "leaf") {
        if (match(node)) return [...above, node];
      } else {
        const found = walk(node.children, [...above, node]);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(tree, []);
}

/** Find a leaf anywhere in the tree by its slug. */
export function leafBySlug(tree: readonly ArchiveBranch[], slug: string): ArchiveLeaf | undefined {
  const chain = findLeafChain(tree, (entry) => entry.slug === slug);
  const last = chain?.[chain.length - 1];
  return last?.type === "leaf" ? last : undefined;
}

export function folderHref(path: readonly string[]): string {
  // In place on /materials: the archive browser reads ?path= (and ?view=).
  return path.length ? `/materials/?path=${path.join("/")}#archive` : "/materials/#archive";
}

/**
 * Where a leaf opens: the archive search on Documents, scoped to it. A shelf
 * leaf (curated or a narrowed part of a source) travels as ?series=; a source
 * the shelves do not file travels as ?source=. There is no page of its own.
 */
export function leafHref(entry: ArchiveLeaf): string {
  if (entry.slug.startsWith(UNFILED_PREFIX)) return `/search?type=material&source=${encodeURIComponent(entry.source)}`;
  return seriesSearchPath(entry.slug);
}

/**
 * Any shelf leaf as a series, by slug: the curated registry first, then the
 * folder tree's own leaves (Acts, NRB enforcement…), named with their folder
 * ("Laws · Acts") so a filter chip reads on its own. A committee sub-folder
 * resolves without the catalogue too (its scope is all in the slug); given
 * the catalogue it is named with its committee ("Finance Committee · Annual
 * reports"), and without it by the sub-folder alone.
 */
export function archiveSeriesBySlug(
  slug: string,
  catalogue?: DocumentSourcesResponse | null,
): MaterialSeries | undefined {
  const curatedSeries = seriesBySlug(slug);
  if (curatedSeries) return curatedSeries;
  for (const shelf of ARCHIVE_SHELVES) {
    const trail = findTrail(shelf, slug);
    if (!trail) continue;
    const entry = trail[trail.length - 1] as ArchiveLeaf;
    const parent = trail[trail.length - 2];
    const name = parent
      ? { ne: `${parent.name.ne} · ${entry.name.ne}`, en: `${parent.name.en} · ${entry.name.en}` }
      : entry.name;
    return { ...leafSeries(entry), name, typeLabel: name };
  }
  const committee = committeeLeafBySlug(slug);
  if (!committee) return undefined;
  const row = catalogue?.sources.find((entry) => entry.source === committee.source);
  if (!row || !(row.name?.en || row.name?.ne)) return leafSeries(committee);
  const office = officeName(row.publisher);
  const parent = office ? seriesName(row.name, office, row.source) : { ne: row.name?.ne ?? "", en: row.name?.en ?? "" };
  const drawn = committeeBranch(row, parent, catalogue, 1).children.find((entry) => entry.slug === slug) ?? committee;
  const name = {
    ne: [parent.ne || parent.en, drawn.name.ne].join(" · "),
    en: [parent.en || parent.ne, drawn.name.en].join(" · "),
  };
  return { ...leafSeries(committee), name, typeLabel: name };
}

function findTrail(node: ArchiveNode, slug: string): ArchiveNode[] | null {
  if (node.type === "leaf") return node.slug === slug ? [node] : null;
  for (const child of node.children) {
    const trail = findTrail(child, slug);
    if (trail) return [node, ...trail];
  }
  return null;
}

/** The node's name in one language. Only API-filed leaves can lack a pair. */
export function nodeName(node: ArchiveNode, language: string): string {
  const nepali = Boolean(language?.startsWith("ne"));
  return (nepali ? node.name.ne : node.name.en) || node.name.en || node.name.ne;
}

/** The nodes one level below `path` (the root folders for an empty path). */
export function childrenAt(tree: readonly ArchiveBranch[], path: readonly string[]): readonly ArchiveNode[] {
  if (!path.length) return tree;
  const chain = resolvePath(tree, path);
  const last = chain?.[chain.length - 1];
  return last?.type === "branch" ? last.children : [];
}

/** Every leaf under a node (the node itself, for a leaf). */
export function leavesUnder(node: ArchiveNode): ArchiveLeaf[] {
  return leavesOf(node);
}

/** The longest prefix of `path` that resolves in the tree (drops stale segments). */
export function validPath(tree: readonly ArchiveBranch[], path: readonly string[]): string[] {
  const valid: string[] = [];
  let level: readonly ArchiveNode[] = tree;
  for (const slug of path) {
    const next = level.find((node) => node.slug === slug);
    if (!next) break;
    valid.push(slug);
    level = next.type === "branch" ? next.children : [];
  }
  return valid;
}
