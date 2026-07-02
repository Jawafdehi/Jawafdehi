import { describe, expect, it } from "vitest";

import {
  normalizeArchiveSearchParams,
  setArchiveSearchParam,
  toggleArchiveSearchParam,
} from "@/utils/archive-search-params";

describe("archive search params", () => {
  it("removes default pagination and sorting values", () => {
    const params = new URLSearchParams(
      "tags=CIAA&page=1&type=case&sort=relevance",
    );

    expect(normalizeArchiveSearchParams(params).toString()).toBe(
      "tags=CIAA&type=case",
    );
  });

  it("keeps type singular and resets pagination", () => {
    const params = new URLSearchParams("type=case&page=3");

    expect(
      toggleArchiveSearchParam(params, "type", "entity", false).toString(),
    ).toBe("type=entity");
  });

  it("supports repeated tag filters without page one noise", () => {
    const params = new URLSearchParams("tags=CIAA&type=case&page=1");

    expect(
      toggleArchiveSearchParam(params, "tags", "Procurement").toString(),
    ).toBe("type=case&tags=CIAA&tags=Procurement");
  });

  it("omits defaults when setting individual values", () => {
    const params = new URLSearchParams("page=4&sort=newest");

    expect(setArchiveSearchParam(params, "page", 1).toString()).toBe(
      "sort=newest&type=all",
    );
  });

  it("removes invalid singleton values and canonicalizes valid pages", () => {
    const params = new URLSearchParams(
      "page=0003&sort=invalid&type=all&tags=CIAA&tags=Procurement",
    );

    expect(normalizeArchiveSearchParams(params).toString()).toBe(
      "page=3&type=all&tags=CIAA&tags=Procurement",
    );
  });

  it("defaults missing and invalid record types to all", () => {
    const params = new URLSearchParams(
      "page=abc&type=unknown&entity_type=person&entity_type=office",
    );

    expect(normalizeArchiveSearchParams(params).toString()).toBe(
      "type=all&entity_type=person&entity_type=office",
    );
    expect(normalizeArchiveSearchParams(new URLSearchParams()).toString()).toBe(
      "type=all",
    );
  });
});
