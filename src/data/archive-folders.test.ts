import { describe, expect, it } from "vitest";

import {
  ARCHIVE_TREE,
  childrenAt,
  findLeafChain,
  leafSeries,
  leavesUnder,
  nodeCount,
  nodeName,
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

  it("sorts every level alphabetically in the language shown, Others last", () => {
    const en = withUnfiled(catalogue, "en").map((folder) => nodeName(folder, "en"));
    expect(en).toEqual(["Government bodies", "International", "Judiciary", "Laws", "News", "Others"]);
    const ne = withUnfiled(catalogue, "ne").map((folder) => nodeName(folder, "ne"));
    expect(ne.at(-1)).toBe("अन्य");
    expect(ne.slice(0, -1)).toEqual([...ne.slice(0, -1)].sort(new Intl.Collator("ne").compare));
    const oag = childrenAt(withUnfiled(catalogue, "en"), ["government", "auditor-general"]);
    expect(nodeName(oag.at(-1)!, "en")).toBe("Other publications");
  });

  it("gives every node a Nepali and an English name, with no abbreviation as a display name", () => {
    const walk = (nodes: readonly (typeof ARCHIVE_TREE)[number]["children"][number][]): void => {
      for (const node of nodes) {
        expect(node.name.ne).toMatch(/[ऀ-ॿ]/);
        expect(node.name.en.trim().length).toBeGreaterThan(0);
        expect(node.name.en).not.toMatch(/^(CIAA|OCCRP|SEBON|US|NRB|PPMO|DMLI|DRI)\b/);
        if (node.type === "branch") walk(node.children);
      }
    };
    walk(ARCHIVE_TREE);
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
});
