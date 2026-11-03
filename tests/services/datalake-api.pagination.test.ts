import { describe, expect, it, vi } from "vitest";

import { MAX_SUB_RESOURCE_PAGES, getAllPages } from "@/services/datalake-api";

// The API pages hearings at 20 and ignores page_size, and the page used to read
// only the first page: 072-DF-0005 holds 30 rows and showed 20, and at least
// 4,663 Supreme Court cases hold more than 20.
describe("getAllPages", () => {
  const page = (n: number, size: number, more: boolean) => ({
    data: {
      count: 30,
      next: more ? `https://api.jawafdehi.org/x/?page=${n + 1}` : null,
      previous: null,
      results: Array.from({ length: size }, (_, i) => ({ id: n * 100 + i })),
    },
  });

  it("follows every page and asks for each one on the same endpoint", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(page(1, 20, true))
      .mockResolvedValueOnce(page(2, 10, false));
    const rows = await getAllPages<{ id: number }>(get, "/api/courtcases/supreme/072-DF-0005/hearings");
    expect(rows).toHaveLength(30);
    expect(get).toHaveBeenNthCalledWith(1, "/api/courtcases/supreme/072-DF-0005/hearings", {});
    expect(get).toHaveBeenNthCalledWith(2, "/api/courtcases/supreme/072-DF-0005/hearings", {
      params: { page: 2 },
    });
  });

  it("returns a bare-array response as-is", async () => {
    const get = vi.fn().mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] });
    expect(await getAllPages(get, "/x")).toEqual([{ id: 1 }, { id: 2 }]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("stops at the runaway cap", async () => {
    const get = vi.fn().mockImplementation(async () => page(1, 1, true));
    const rows = await getAllPages(get, "/x");
    expect(get).toHaveBeenCalledTimes(MAX_SUB_RESOURCE_PAGES);
    expect(rows).toHaveLength(MAX_SUB_RESOURCE_PAGES);
  });

  it("propagates a failure so the caller can degrade", async () => {
    const get = vi.fn().mockResolvedValueOnce(page(1, 20, true)).mockRejectedValueOnce(new Error("503"));
    await expect(getAllPages(get, "/x")).rejects.toThrow("503");
  });
});
