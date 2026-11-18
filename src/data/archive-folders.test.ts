import { describe, expect, it } from "vitest";

import {
  ARCHIVE_SHELVES,
  childrenAt,
  findLeafChain,
  leafSeries,
  leavesUnder,
  nodeCount,
  nodeName,
  shelfLeafBySlug,
  unfiledSlug,
  validPath,
  withUnfiled,
} from "@/data/archive-folders";
import type { DocumentSourcesResponse } from "@/lib/document-sources";

const row = (source: string, count: number, series?: { bucket: string; count: number }[]) => ({
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
      "Laws",
      "News",
      "International",
      "Others",
    ]);
    expect(withUnfiled(catalogue, "ne").map((folder) => nodeName(folder, "ne"))).toEqual([
      "न्यायपालिका",
      "सरकारी निकाय",
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

  it("resolves a shelf's series before the catalogue has loaded", () => {
    expect(shelfLeafBySlug("dri-releases-reports")?.source).toBe("dri");
    expect(shelfLeafBySlug("nope")).toBeUndefined();
  });
});
