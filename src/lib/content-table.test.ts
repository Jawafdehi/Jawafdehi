import { describe, it, expect } from "vitest";

import { columnWidths, dropEmptyColumns } from "@/lib/content-table";

describe("dropEmptyColumns", () => {
  it("removes a column that is blank in every row", () => {
    // The shape of ciaa-2081-82 p0052-t1: a ruled grid resolved more finely
    // than the printed table, leaving columns that hold nothing anywhere.
    const rows = [
      ["क्र.सं.", "", "उजुरीको व्यहोरा", ""],
      ["1", "", "जिल्ला ताप्लेजुङ", ""],
      ["2", "", "वडा नं. २", ""],
    ];

    expect(dropEmptyColumns(rows)).toEqual([
      ["क्र.सं.", "उजुरीको व्यहोरा"],
      ["1", "जिल्ला ताप्लेजुङ"],
      ["2", "वडा नं. २"],
    ]);
  });

  it("keeps a column whose header is blank but whose body is not", () => {
    // A merged header cell arrives as an empty string in every column it
    // spanned but the first, so "blank header" is NOT evidence of an empty
    // column — the data under it is the document's.
    const rows = [
      ["आ.व.", ""],
      ["२०७४/७५", "१९४८८"],
    ];

    expect(dropEmptyColumns(rows)).toEqual(rows);
  });

  it("treats a whitespace-only cell as empty but a '-' as a value", () => {
    // These tables write nil as a dash. Dropping that column would delete the
    // document's own statement that the figure is nil.
    const rows = [
      ["क", "   ", "-"],
      ["ख", "", "-"],
    ];

    expect(dropEmptyColumns(rows)).toEqual([
      ["क", "-"],
      ["ख", "-"],
    ]);
  });

  it("pads ragged rows rather than misaligning the survivors", () => {
    const rows = [["a", "", "b", "c"], ["d", "", "e"], ["f"]];

    expect(dropEmptyColumns(rows)).toEqual([
      ["a", "b", "c"],
      ["d", "e", ""],
      ["f", "", ""],
    ]);
  });

  it("hands back a table that is empty throughout untouched", () => {
    const rows = [
      ["", ""],
      ["", ""],
    ];
    expect(dropEmptyColumns(rows)).toEqual(rows);
  });

  it("never drops a cell that holds anything", () => {
    // The property that makes this safe to run on every table in the archive.
    const rows = [
      ["", "x", "", ""],
      ["", "", "", "y"],
      ["", "", "", ""],
    ];
    const before = rows.flat().filter((c) => c.trim()).sort();
    const after = dropEmptyColumns(rows).flat().filter((c) => c.trim()).sort();
    expect(after).toEqual(before);
  });
});

describe("columnWidths", () => {
  it("sizes each column from its longest cell, not a fixed minimum", () => {
    const rows = [
      ["१", "क्र.सं.", "जिल्ला ताप्लेजुङ, फुङलिङ नगरपालिकाको वडा नं. २"],
      ["२", "सं.", "वडा"],
    ];

    expect(columnWidths(rows)).toEqual(["narrow", "normal", "wide"]);
  });

  it("measures the longest cell, not the average", () => {
    // One long cell in an otherwise short column still has to fit; sized to the
    // average it wraps to five lines.
    const rows = [["क"], ["ख"], ["यो एउटा निकै लामो वाक्य हो जुन छोटो हुँदैन"]];
    expect(columnWidths(rows)).toEqual(["wide"]);
  });
});
