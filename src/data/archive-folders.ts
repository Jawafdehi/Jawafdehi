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
  pressReleasesUploads: { ne: "प्रेस विज्ञप्ति (मुद्दासँग अपलोड गरिएका)", en: "Press releases (case uploads)" },
  chargeSheets: { ne: "अभियोगपत्र", en: "Charge sheets" },
  chargeSheetsUploads: { ne: "अभियोगपत्र (मुद्दासँग अपलोड गरिएका)", en: "Charge sheets (case uploads)" },
  reports: { ne: "प्रतिवेदन", en: "Reports" },
  enforcement: { ne: "कारबाही", en: "Enforcement actions" },
  publications: { ne: "प्रकाशन", en: "Publications" },
  judgments: { ne: "फैसला", en: "Judgments" },
} as const;

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
    leaf("ciaa-press-releases-uploads", "press_release", W.pressReleasesUploads),
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
  // Government bodies › Regulators
  branch("nrb", { ne: "नेपाल राष्ट्र बैंक", en: "Nepal Rastra Bank" }, 3, [
    leaf("nrb-enforcement", "nrb", W.enforcement, { kind: "enforcement-action" }),
    leaf("nrb-reports", "nrb", W.reports, { kindExclude: ["enforcement-action"] }),
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
  branch("public-accounts-committee", { ne: "सार्वजनिक लेखा समिति", en: "Public Accounts Committee" }, 4, [
    leaf("pac-annual-reports", "parliament_pac", W.annualReports, { kind: "pac-annual-report" }),
    leaf("pac-meeting-decisions", "parliament_pac", { ne: "बैठकका निर्णय", en: "Meeting decisions" }, {
      kind: "pac-meeting-decisions",
    }),
    leaf("pac-subcommittee-reports", "parliament_pac", { ne: "उपसमितिका प्रतिवेदन", en: "Sub-committee reports" }, {
      kind: "pac-subcommittee-report",
    }),
    leaf("pac-attendance", "parliament_pac", { ne: "उपस्थिति विवरण", en: "Attendance records" }, {
      kind: "pac-attendance",
    }),
    leaf("pac-other", "parliament_pac", { ne: "अन्य", en: "Other" }, {
      kindExclude: PAC_KINDS,
    }),
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
  const folder =
    tree.find((entry) => entry.slug === where.folder) ?? tree.find((entry) => entry.slug === UNFILED_FOLDER)!;
  const sub = where.subfolder
    ? subfolders.get(folder)?.find((entry) => entry.slug === where.subfolder)
    : undefined;
  (sub ?? folder).children.push(node);
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
    if (where) place(tree, subfolders, shelf, where);
  }
  const known = new Set(ARCHIVE_SHELVES.flatMap(leavesOf).map((entry) => entry.source));
  for (const row of listedSources(catalogue)) {
    if (known.has(row.source)) continue;
    place(
      tree,
      subfolders,
      {
        type: "leaf",
        slug: unfiledSlug(row.source),
        source: row.source,
        name: { ne: row.name?.ne ?? "", en: row.name?.en ?? row.source },
        apiName: row.name,
      },
      { folder: row.folder || UNFILED_FOLDER, subfolder: row.subfolder },
    );
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

/** A shelf leaf by slug, wherever (or whether) the catalogue files it. */
export function shelfLeafBySlug(slug: string): ArchiveLeaf | undefined {
  return ARCHIVE_SHELVES.flatMap(leavesOf).find((entry) => entry.slug === slug);
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
 * ("Laws · Acts") so a filter chip reads on its own.
 */
export function archiveSeriesBySlug(slug: string): MaterialSeries | undefined {
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
  return undefined;
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
