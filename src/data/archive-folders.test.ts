import { describe, expect, it } from "vitest";

import { ARCHIVE_SHELVES, childrenAt, findLeafChain, leafSeries, leavesUnder, nodeCount, nodeName, shelfLeafBySlug, unfiledSlug, validPath, withUnfiled, leafHref, archiveSeriesBySlug, DEFAULT_FOLDERS, officeName, officeSlug, seriesName } from "@/data/archive-folders";
import { filedRow } from "@/data/archive-folders.fixtures";
import type { DocumentSourcesResponse } from "@/lib/document-sources";

// Each row carries the folder the API files its source under in production.
const row = (source: string, count: number, series?: { bucket: string; count: number }[]) =>
  filedRow({
    source,
    name: { en: `${source} name` },
    publisher: null,
    labelled: true,
    count,
    ...(series ? { series } : {}),
  });

const catalogue: DocumentSourcesResponse = {
  ready: true,
  sources: [
    row("nkp", 10_554),
    row("judiciary_report", 35, [
      { bucket: "supreme-court-annual-report", count: 17 },
      { bucket: "judicial-council-annual-report", count: 12 },
      { bucket: "special-court-annual-report", count: 5 },
      { bucket: "unknown-kind", count: 1 },
    ]),
    row("legal_corpus", 758, [
      { bucket: "law-act", count: 369 },
      { bucket: "law-regulation", count: 321 },
      { bucket: "court-rules", count: 4 },
    ]),
    row("official_report", 235),
    row("dri", 160),
    row("ciaa_press_release", 3_576),
    row("brand_new_source", 7),
  ],
};

describe("archive folder tree", () => {
  it("files a source the tree does not know under Others, so it still appears", () => {
    const others = withUnfiled(catalogue).find((folder) => folder.slug === "others")!;
    expect(leavesUnder(others).map((leaf) => leaf.source)).toContain("brand_new_source");
    expect(nodeCount(others, catalogue)).toBe(7);
  });

  it("counts every document of a split source exactly once across its leaves", () => {
    const tree = withUnfiled(catalogue);
    const judiciaryReportLeaves = tree
      .flatMap(leavesUnder)
      .filter((leaf) => leaf.source === "judiciary_report");
    const sum = judiciaryReportLeaves.reduce(
      (total, leaf) => total + (nodeCount(leaf, catalogue) ?? 0),
      0,
    );
    // The Supreme Court leaf is the complement, so the unknown kind lands there.
    expect(sum).toBe(35);
    const laws = tree.flatMap(leavesUnder).filter((leaf) => leaf.source === "legal_corpus");
    expect(laws.reduce((total, leaf) => total + (nodeCount(leaf, catalogue) ?? 0), 0)).toBe(758);
  });

  it("sums a folder from its leaves, and shows no count until the catalogue is ready", () => {
    const tree = withUnfiled(catalogue);
    const judiciary = tree.find((folder) => folder.slug === "judiciary")!;
    expect(nodeCount(judiciary, catalogue)).toBe(10_554 + 35);
    expect(nodeCount(judiciary, { ...catalogue, ready: false })).toBeNull();
  });

  it("keeps the top-level folders in their fixed order in both languages", () => {
    expect(withUnfiled(catalogue, "en").map((folder) => nodeName(folder, "en"))).toEqual([
      "Judiciary",
      "Government bodies",
      "Parliament",
      "Laws",
      "News",
      "International",
      "Others",
    ]);
    expect(withUnfiled(catalogue, "ne").map((folder) => nodeName(folder, "ne"))).toEqual([
      "न्यायपालिका",
      "सरकारी निकाय",
      "संघीय संसद",
      "कानुन",
      "समाचार",
      "अन्तर्राष्ट्रिय",
      "अन्य",
    ]);
  });

  it("sorts every level below the top alphabetically in the language shown, Other last", () => {
    const offices = childrenAt(withUnfiled(catalogue, "en"), ["government"]).map((node) => nodeName(node, "en"));
    expect(offices).toEqual([...offices].sort(new Intl.Collator("en").compare));
    const neOffices = childrenAt(withUnfiled(catalogue, "ne"), ["government"]).map((node) => nodeName(node, "ne"));
    expect(neOffices).toEqual([...neOffices].sort(new Intl.Collator("ne").compare));
    const oag = childrenAt(withUnfiled(catalogue, "en"), ["government", "auditor-general"]);
    expect(nodeName(oag.at(-1)!, "en")).toBe("Other publications");
  });

  it("gives every node a Nepali and an English name, with no abbreviation as a display name", () => {
    const walk = (nodes: readonly (typeof ARCHIVE_SHELVES)[number][]): void => {
      for (const node of nodes) {
        expect(node.name.ne).toMatch(/[ऀ-ॿ]/);
        expect(node.name.en.trim().length).toBeGreaterThan(0);
        expect(node.name.en).not.toMatch(/^(CIAA|OCCRP|SEBON|US|NRB|PPMO|DMLI|DRI)\b/);
        if (node.type === "branch") walk(node.children);
      }
    };
    walk(ARCHIVE_SHELVES);
  });

  it("resolves paths, drops stale segments, and finds a leaf's chain", () => {
    const tree = withUnfiled(catalogue);
    expect(validPath(tree, ["government", "nope", "x"])).toEqual(["government"]);
    const chain = findLeafChain(tree, (leaf) => leaf.slug === "supreme-court-precedents")!;
    expect(chain.map((node) => node.slug)).toEqual(["judiciary", "supreme-court", "supreme-court-precedents"]);
    const leaf = chain.at(-1)!;
    expect(leaf.type === "leaf" && leafSeries(leaf).source).toBe("nkp");
  });

  it("gives an auto-filed source with a slash in its token a path-safe slug that resolves", () => {
    const withSlash: DocumentSourcesResponse = {
      ready: true,
      sources: [{ ...row("province/bagmati", 3) }],
    };
    const tree = withUnfiled(withSlash);
    const slug = unfiledSlug("province/bagmati");
    expect(slug).not.toContain("/");
    expect(unfiledSlug("province/bagmati")).not.toBe(unfiledSlug("province_bagmati"));
    // ?path=others/<slug> must resolve all the way to the leaf.
    expect(validPath(tree, ["others", slug])).toEqual(["others", slug]);
    const chain = findLeafChain(tree, (leaf) => leaf.slug === slug)!;
    expect(chain.at(-1)?.type === "leaf" && chain.at(-1)!.slug).toBe(slug);
  });

  it("files the Nepal Rajpatra under Laws and Nepal Police under Government bodies", () => {
    const tree = withUnfiled({
      ready: true,
      sources: [row("rajpatra", 120), row("nepal_police", 2)],
    });
    const chainOf = (source: string) =>
      findLeafChain(tree, (leaf) => leaf.source === source)!.map((node) => node.slug);
    expect(chainOf("rajpatra")).toEqual(["laws", "rajpatra"]);
    expect(chainOf("nepal_police")).toEqual(["government", "nepal-police", "nepal-police-press-releases"]);
    expect(nodeCount(tree.find((folder) => folder.slug === "others")!, { ready: true, sources: [row("rajpatra", 120), row("nepal_police", 2)] })).toBe(0);
  });
});

describe("the Parliament folder", () => {
  it("files the Public Accounts Committee under Parliament, one shelf per kind", () => {
    const catalogue = { ready: true, sources: [row("parliament_pac", 138)] };
    const tree = withUnfiled(catalogue);
    const committee = findLeafChain(tree, (leaf) => leaf.slug === "pac-meeting-decisions")!;
    expect(committee.map((node) => node.slug)).toEqual([
      "parliament",
      "public-accounts-committee",
      "pac-meeting-decisions",
    ]);
    const shelf = committee[1];
    expect(shelf.type === "branch" && shelf.children.map((child) => child.slug).sort()).toEqual([
      "pac-annual-reports",
      "pac-attendance",
      "pac-meeting-decisions",
      "pac-other",
      "pac-subcommittee-reports",
    ]);
    expect(nodeCount(tree.find((folder) => folder.slug === "others")!, catalogue)).toBe(0);
  });

  it("draws Parliament right after Government bodies before the catalogue arrives", () => {
    const keys = DEFAULT_FOLDERS.map((folder) => folder.key);
    expect(keys.indexOf("parliament")).toBe(keys.indexOf("government") + 1);
  });
});

describe("archive folders from the API (JAW-87)", () => {
  const folders = [
    { key: "judiciary", name: { en: "Judiciary", ne: "न्यायपालिका" } },
    {
      key: "government",
      name: { en: "Government bodies", ne: "सरकारी निकाय" },
      subfolders: [{ key: "regulators", name: { en: "Regulators", ne: "नियामक निकाय" } }],
    },
    { key: "laws", name: { en: "Laws", ne: "कानुन" } },
    { key: "others", name: { en: "Others", ne: "अन्य" } },
  ];
  const filed = (source: string, count: number, folder: string | null, subfolder: string | null = null) => ({
    ...row(source, count),
    folder,
    subfolder,
  });
  const chainOf = (tree: ReturnType<typeof withUnfiled>, source: string) =>
    findLeafChain(tree, (leaf) => leaf.source === source)?.map((node) => node.slug);

  it("files a new source in the folder the API gives it, not in Others", () => {
    const tree = withUnfiled({
      ready: true,
      folders,
      sources: [filed("judicial_council", 4, "judiciary"), filed("beema_samiti", 2, "government", "regulators")],
    });
    expect(chainOf(tree, "judicial_council")).toEqual(["judiciary", unfiledSlug("judicial_council")]);
    expect(chainOf(tree, "beema_samiti")).toEqual(["government", "regulators", unfiledSlug("beema_samiti")]);
    expect(nodeCount(tree.find((folder) => folder.slug === "others")!, { ready: true, sources: [] })).toBe(0);
  });

  it("moves a curated shelf when the API moves its source", () => {
    const tree = withUnfiled({ ready: true, folders, sources: [filed("dri", 160, "others")] });
    expect(chainOf(tree, "dri")).toEqual(["others", "dri", "dri-releases-reports"]);
  });

  it("puts the regulators in their sub-folder and drops an empty sub-folder", () => {
    const tree = withUnfiled({ ready: true, folders, sources: [filed("nrb", 160, "government", "regulators")] });
    expect(chainOf(tree, "nrb")).toEqual(["government", "regulators", "nrb", "nrb-annual-reports"]);
    const none = withUnfiled({ ready: true, folders, sources: [filed("dri", 1, "government")] });
    expect(childrenAt(none, ["government"]).map((node) => node.slug)).not.toContain("regulators");
  });

  it("takes the folders, their order and their names from the API", () => {
    const tree = withUnfiled({ ready: true, folders, sources: [] }, "ne");
    expect(tree.map((folder) => folder.slug)).toEqual(["judiciary", "government", "laws", "others"]);
    expect(nodeName(tree[1], "ne")).toBe("सरकारी निकाय");
  });

  it("sends a source with an unknown folder, or none, to Others", () => {
    const tree = withUnfiled({
      ready: true,
      folders,
      sources: [filed("mystery", 3, "ministries"), filed("legacy_token", 2, null)],
    });
    expect(chainOf(tree, "mystery")).toEqual(["others", unfiledSlug("mystery")]);
    expect(chainOf(tree, "legacy_token")).toEqual(["others", unfiledSlug("legacy_token")]);
  });

  it("does not draw a shelf none of whose sources is in the catalogue", () => {
    const tree = withUnfiled({ ready: true, folders, sources: [filed("nkp", 1, "judiciary")] });
    expect(chainOf(tree, "dri")).toBeUndefined();
    expect(chainOf(tree, "nkp")).toEqual(["judiciary", "supreme-court", "supreme-court-precedents"]);
  });

  it("resolves a shelf's series before the catalogue has loaded", () => {
    expect(shelfLeafBySlug("dri-releases-reports")?.source).toBe("dri");
    expect(shelfLeafBySlug("nope")).toBeUndefined();
  });
});

describe("every source under an office, with a short series name", () => {
  const chainOf = (tree: ReturnType<typeof withUnfiled>, source: string) =>
    findLeafChain(tree, (leaf) => leaf.source === source)?.map((node) => node.slug);
  const withPublisher = (
    source: string,
    count: number,
    name: { en: string; ne?: string },
    publisher: { en: string; ne?: string } | null,
    folder = "government",
    subfolder: string | null = null,
  ) => ({ ...row(source, count), name, publisher, folder, subfolder });

  it("files each source loaded in November under its office", () => {
    const sources = ["moha", "nhrc", "psc", "trc", "nea", "election_commission", "nta", "erc"];
    const tree = withUnfiled({ ready: true, sources: sources.map((source) => row(source, 5)) });
    expect(chainOf(tree, "moha")).toEqual(["government", "home-ministry", "home-ministry-documents"]);
    expect(chainOf(tree, "nhrc")).toEqual(["government", "nhrc", "nhrc-reports-releases"]);
    expect(chainOf(tree, "election_commission")).toEqual([
      "government",
      "election-commission",
      "election-commission-documents",
    ]);
    expect(chainOf(tree, "nta")).toEqual(["government", "regulators", "nta", "nta-reports-directives"]);
    expect(chainOf(tree, "erc")).toEqual(["government", "regulators", "erc", "erc-reports-decisions"]);
    // Nothing loose: every child of Government bodies (and of Regulators) is an office.
    const government = childrenAt(tree, ["government"]);
    expect(government.filter((node) => node.type === "leaf")).toEqual([]);
    expect(childrenAt(tree, ["government", "regulators"]).filter((node) => node.type === "leaf")).toEqual([]);
  });

  it("splits Nepal Rastra Bank by kind and counts each document once", () => {
    const nrb = row("nrb", 1_524, [
      { bucket: "enforcement-action", count: 71 },
      { bucket: "nrb-annual-report", count: 43 },
      { bucket: "bank-supervision-report", count: 26 },
      { bucket: "fiu-annual-report", count: 14 },
      { bucket: "fisd-supervision-report", count: 5 },
    ]);
    const catalogue = { ready: true, sources: [nrb] };
    const tree = withUnfiled(catalogue, "en");
    const leaves = childrenAt(tree, ["government", "regulators", "nrb"]);
    expect(leaves.map((leaf) => [nodeName(leaf, "en"), nodeCount(leaf, catalogue)])).toEqual([
      ["Annual reports", 43],
      ["Bank supervision reports", 26],
      ["Enforcement actions", 71],
      ["Financial Information Unit (FIU-Nepal) annual reports", 14],
      ["Financial institutions supervision reports", 5],
      ["Other reports", 1_524 - 71 - 43 - 26 - 14 - 5],
    ]);
    expect(leaves.reduce((sum, leaf) => sum + (nodeCount(leaf, catalogue) ?? 0), 0)).toBe(1_524);
  });

  it("opens an office from the API publisher for a source no shelf knows, and groups by it", () => {
    const tree = withUnfiled(
      {
        ready: true,
        sources: [
          withPublisher(
            "mof_budget",
            4,
            { en: "Ministry of Education reports", ne: "शिक्षा मन्त्रालयका प्रतिवेदन" },
            { en: "Ministry of Education, Government of Nepal", ne: "शिक्षा मन्त्रालय, नेपाल सरकार" },
          ),
          withPublisher(
            "moe_circulars",
            2,
            { en: "Circulars", ne: "परिपत्र" },
            { en: "Ministry of Education", ne: "शिक्षा मन्त्रालय" },
          ),
        ],
      },
      "en",
    );
    const office = officeSlug({ en: "Ministry of Education", ne: "" });
    expect(office).not.toContain("/");
    expect(chainOf(tree, "mof_budget")).toEqual(["government", office, unfiledSlug("mof_budget")]);
    expect(chainOf(tree, "moe_circulars")).toEqual(["government", office, unfiledSlug("moe_circulars")]);
    const branch = childrenAt(tree, ["government"]).find((node) => node.slug === office)!;
    expect(nodeName(branch, "en")).toBe("Ministry of Education");
    expect(nodeName(branch, "ne")).toBe("शिक्षा मन्त्रालय");
    expect(childrenAt(tree, ["government", office]).map((leaf) => [nodeName(leaf, "en"), nodeName(leaf, "ne")])).toEqual([
      ["Circulars", "परिपत्र"],
      ["Reports", "प्रतिवेदन"],
    ]);
  });

  it("puts a new source into its publisher's existing shelf, without changing the shelves", () => {
    const before = JSON.stringify(ARCHIVE_SHELVES);
    const catalogue = {
      ready: true,
      sources: [
        row("ppmo", 108),
        withPublisher("ppmo_debarment", 3, { en: "PPMO debarment notices" }, { en: "Public Procurement Monitoring Office" }),
      ],
    };
    const tree = withUnfiled(catalogue);
    withUnfiled(catalogue);
    expect(chainOf(tree, "ppmo_debarment")).toEqual(["government", "ppmo", unfiledSlug("ppmo_debarment")]);
    expect(JSON.stringify(ARCHIVE_SHELVES)).toBe(before);
  });

  it("keeps a source with no publisher as a leaf of its folder", () => {
    const tree = withUnfiled({ ready: true, sources: [withPublisher("loose", 1, { en: "Loose papers" }, null)] });
    expect(chainOf(tree, "loose")).toEqual(["government", unfiledSlug("loose")]);
  });

  it("names a series in full when it does not start with its office", () => {
    expect(seriesName({ en: "Circulars", ne: "परिपत्र" }, { en: "Ministry of Education", ne: "शिक्षा मन्त्रालय" }, "x")).toEqual({
      en: "Circulars",
      ne: "परिपत्र",
    });
    expect(officeName({ en: "Truth and Reconciliation Commission, Nepal", ne: "सत्य निरुपण तथा मेलमिलाप आयोग, नेपाल" })).toEqual({
      en: "Truth and Reconciliation Commission",
      ne: "सत्य निरुपण तथा मेलमिलाप आयोग",
    });
    expect(officeName(null)).toBeNull();
  });
});

describe("a folder opens as the archive search", () => {
  it("sends a shelf leaf to /search with ?series=", () => {
    expect(leafHref(shelfLeafBySlug("acts")!)).toBe("/search?type=material&series=acts");
  });

  it("sends a source the shelves do not file to /search with ?source=", () => {
    expect(leafHref({ type: "leaf", slug: unfiledSlug("mystery"), source: "mystery", name: { ne: "", en: "Mystery" } })).toBe(
      "/search?type=material&source=mystery",
    );
  });

  it("resolves a non-curated leaf to its scope, named with its folder", () => {
    const acts = archiveSeriesBySlug("acts");
    expect(acts?.source).toBe("legal_corpus");
    expect(acts?.kind).toBe("law-act");
    expect(acts?.name.en).toMatch(/· Acts$/);
    expect(archiveSeriesBySlug("no-such-shelf")).toBeUndefined();
  });
});
