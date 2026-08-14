import { describe, it, expect, vi, beforeEach } from "vitest";

// The OIDC token fetch touches the browser UserManager; stub it so the request
// interceptor is inert in tests.
vi.mock("./oidc", () => ({ getAccessToken: vi.fn().mockResolvedValue(null) }));

// Capture what the axios instance is asked to fetch. `axios.create` returns our
// spy client; each verb records its (url, body) and resolves an empty body so
// the wrappers just relay the shape. `vi.hoisted` lets the mock factory (which
// is hoisted above imports) share the `calls` array with the test bodies.
const { calls, responses } = vi.hoisted(() => ({
  calls: [] as {
    method: string;
    url: string;
    body?: unknown;
    config?: unknown;
  }[],
  // Per-method queue of scripted responses. When a queue has an entry it is
  // shifted and used (resolve `{data, headers}` or reject an axios-like error);
  // otherwise the default empty body is returned. Lets the optimistic-lock and
  // etag tests drive status codes / headers without touching the happy path.
  responses: {} as Record<
    string,
    Array<{ data?: unknown; headers?: unknown; status?: number }>
  >,
}));

vi.mock("axios", () => {
  const record =
    (method: string) =>
    (url: string, body?: unknown, config?: unknown) => {
      calls.push({ method, url, body, config });
      const queued = responses[method]?.shift();
      if (queued && typeof queued.status === "number" && queued.status >= 400) {
        return Promise.reject({ response: { status: queued.status, data: queued.data } });
      }
      return Promise.resolve({
        data: queued?.data ?? {},
        headers: queued?.headers ?? {},
      });
    };
  const instance = {
    get: record("get"),
    post: record("post"),
    put: record("put"),
    patch: record("patch"),
    delete: record("delete"),
    interceptors: { request: { use: () => undefined } },
  };
  return { default: { create: () => instance } };
});

import {
  listEntities,
  getEntity,
  deleteEntity,
  reindexEntities,
  searchEntities,
  listCourtCases,
  listCourts,
  deleteCourtCase,
  getCourt,
  createCourt,
  updateCourt,
  getFirm,
  createFirm,
  updateFirm,
  uploadMaterialFile,
  listMaterials,
  deleteMaterial,
  patchMaterialVisibilityPolicy,
  listCases,
  patchCase,
  patchCaseWithEtag,
  getCaseWithEtag,
  getCaseHistory,
  deleteCase,
  CaseConflictError,
} from "./admin-api";

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(responses)) delete responses[k];
});

// TASK A — the client must address the SINGLE unified /api root; the former
// /api/nes and /api/ngm prefixes were hard-cut.
describe("admin-api unified paths (no /api/nes or /api/ngm)", () => {
  it("routes entities to /api/entities and reindex to /api/admin/reindex", async () => {
    await listEntities();
    await getEntity("person/ram-bahadur");
    await deleteEntity("person/ram-bahadur");
    await reindexEntities();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "get /api/entities",
      "get /api/entities/person/ram-bahadur",
      "delete /api/entities/person/ram-bahadur",
      "post /api/admin/reindex",
    ]);
  });

  it("routes court cases to /api/courtcases and courts to /api/courts", async () => {
    await listCourtCases();
    await listCourts();
    await deleteCourtCase("special", "081-CR-0060");
    expect(calls.map((c) => c.url)).toEqual([
      "/api/courtcases/",
      "/api/courts/",
      "/api/courtcases/special/081-CR-0060",
    ]);
  });

  it("normalizes the bare-array /api/courts/ response into a paginated envelope (ADMIN-8)", async () => {
    // /api/courts/ is unpaginated on the backend (pagination_class = None) and
    // returns a plain array. listCourts must wrap it as { count, next, results }
    // so the generic ResourceTable (which reads .results/.count) renders rows
    // instead of an empty table.
    responses.get = [
      { data: [{ identifier: "kathmandudc" }, { identifier: "supremecourt" }] },
    ];
    const page = await listCourts();
    expect(page.results.map((c) => (c as { identifier: string }).identifier)).toEqual([
      "kathmandudc",
      "supremecourt",
    ]);
    expect(page.count).toBe(2);
    expect(page.next).toBeNull();
  });

  it("passes an already-paginated /api/courts/ envelope through unchanged", async () => {
    // Defensive: if the backend ever starts paginating courts, don't double-wrap.
    responses.get = [
      { data: { count: 1, next: null, previous: null, results: [{ identifier: "x" }] } },
    ];
    const page = await listCourts();
    expect(page.count).toBe(1);
    expect(page.results).toHaveLength(1);
  });

  it("routes materials to /api/materials", async () => {
    await listMaterials();
    await deleteMaterial("ciaa", "press-2081-042");
    expect(calls.map((c) => c.url)).toEqual([
      "/api/materials/",
      "/api/materials/ciaa/press-2081-042",
    ]);
  });

  it("PATCHes a material's visibility policy to /api/materials/ addressed by ?iri=", async () => {
    // The policy is set out-of-band (the API strips control keys from the doc),
    // so it travels as a bare {visibility_policy} body with the full @id in ?iri=.
    await patchMaterialVisibilityPolicy(
      "https://jawafdehi.org/material/ciaa/press-2081-042",
      "PRIVATE",
    );
    expect(calls[0]).toMatchObject({
      method: "patch",
      url: "/api/materials/",
      body: { visibility_policy: "PRIVATE" },
      config: { params: { iri: "https://jawafdehi.org/material/ciaa/press-2081-042" } },
    });
  });

  it("keeps Jawafdehi cases on /api/cases and PATCHes with RFC-6902 ops", async () => {
    await listCases();
    await patchCase("oxygen-plant", [{ op: "replace", path: "/title", value: "X" }]);
    await deleteCase("oxygen-plant");
    expect(calls[0].url).toBe("/api/cases/");
    expect(calls[1]).toMatchObject({
      method: "patch",
      url: "/api/cases/oxygen-plant/",
      body: [{ op: "replace", path: "/title", value: "X" }],
    });
    expect(calls[2]).toMatchObject({
      method: "delete",
      url: "/api/cases/oxygen-plant/",
    });
  });

  it("routes the entity picker (searchEntities) to the unified index, not /api/entities", async () => {
    // /api/entities?query= scores in Python over only the first 5000 rows by
    // IRI, and ~162.8k of ~185k prod entities sit under `person/`, which sorts
    // past that window — so a person is unreachable there. Text search must go
    // to the OpenSearch-backed /api/search/.
    responses.get = [
      {
        data: {
          count: 30,
          results: Array.from({ length: 50 }, (_, i) => ({
            id: `https://jawafdehi.org/entity/person/p-${i}`,
            title: { en: `P${i}`, ne: null },
          })),
        },
      },
    ];
    const hits = await searchEntities("ram", 10);
    expect(calls[0].method).toBe("get");
    expect(calls[0].url).toContain("/api/search/");
    expect(calls[0].url).not.toContain("/api/entities");
    const params = new URLSearchParams(calls[0].url.split("?")[1]);
    expect(params.get("q")).toBe("ram");
    expect(params.get("type")).toBe("entity");
    // Pages are read at the endpoint's max size and sliced client-side, so the
    // caller's limit governs the window returned, not the wire page_size.
    expect(params.get("page_size")).toBe("50");
    expect(hits).toHaveLength(10);
  });

  it("routes courts to /api/courts (create=POST list, update=PUT detail)", async () => {
    await getCourt("special");
    await createCourt({ identifier: "special" });
    await updateCourt("special", { identifier: "special" });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "get /api/courts/special/",
      "post /api/courts/",
      "put /api/courts/special/",
    ]);
  });

  it("routes firms to /api/firms keyed by numeric id (update=PATCH)", async () => {
    await getFirm(7);
    await createFirm({ firm_name: "ACME Builders" });
    await updateFirm(7, { firm_name: "ACME Builders" });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "get /api/firms/7/",
      "post /api/firms/",
      "patch /api/firms/7/",
    ]);
  });

  it("uploads a material file to /api/materials/{source}/{ident}/file", async () => {
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    await uploadMaterialFile("ciaa", "press-2081-042", file, "RAW", "official_report");
    expect(calls[0].method).toBe("post");
    expect(calls[0].url).toBe("/api/materials/ciaa/press-2081-042/file");
    expect(calls[0].body).toBeInstanceOf(FormData);
    const fd = calls[0].body as FormData;
    expect(fd.get("role")).toBe("RAW");
    expect(fd.get("material_type")).toBe("official_report");
    expect(fd.get("file")).toBeInstanceOf(File);
  });
});

// Entity text search must resolve through the unified OpenSearch index. Rujit
// reported (casework channel, 2026-08-13) that searching "Sunil Poudel" in
// /admin/entities returned three unrelated rows and not the person — who exists
// with that exact name.en. Cause: /api/entities?query= scores in Python over
// only the first 5000 rows ordered by IRI, and `person/` sorts past that window.
describe("admin-api entity search routing", () => {
  // `count` results starting at absolute index `from`, as /api/search/ returns them.
  const page = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `https://jawafdehi.org/entity/person/p-${from + i}`,
      title: { en: `P${from + i}`, ne: null },
      extra: { type: "Person" },
    }));

  it("browsing with no query stays on /api/entities", async () => {
    // No query means nothing to rank, and the list endpoint gives a true total
    // over a stable IRI order — which the search index does not.
    await listEntities({ limit: 50, offset: 0 });
    expect(calls[0].url).toBe("/api/entities");
  });

  it("a prefix-scoped query stays on /api/entities", async () => {
    // entity_prefix is not an /api/search/ facet, and /api/entities pushes it
    // into SQL *before* the 5000-row cap, so it is served correctly there.
    await listEntities({ query: "dhami", entity_prefix: "person" });
    expect(calls[0].url).toBe("/api/entities");
  });

  it("projects search hits onto the EntityRecord shape the admin views read", async () => {
    responses.get = [
      {
        data: {
          count: 1294,
          results: [
            {
              type: "entity",
              id: "https://jawafdehi.org/entity/person/sunila-paudela",
              title: { en: "Sunil Poudel", ne: "सुनिल पौडेल" },
              extra: { type: "Person" },
            },
          ],
        },
      },
    ];
    const res = await listEntities({ query: "Sunil Poudel", limit: 50 });
    expect(res.entities).toEqual([
      {
        "@id": "https://jawafdehi.org/entity/person/sunila-paudela",
        "@type": "Person",
        name: { en: "Sunil Poudel", ne: "सुनिल पौडेल" },
      },
    ]);
    // The corpus-wide count, not the page length: /api/entities?query= reports
    // len(page) as `total`, which made the pager lie.
    expect(res.total).toBe(1294);
  });

  it("splits a comma-joined multi-valued @type back into an array", async () => {
    responses.get = [
      {
        data: {
          count: 1,
          results: [
            {
              id: "https://jawafdehi.org/entity/location/localunit/sunil-smriti-gaunpalika-50209",
              title: { en: "Sunil Smriti Rural Municipality", ne: null },
              extra: { type: "AdministrativeArea,jawafdehi:RuralMunicipality" },
            },
          ],
        },
      },
    ];
    const res = await listEntities({ query: "sunil" });
    expect(res.entities[0]["@type"]).toEqual([
      "AdministrativeArea",
      "jawafdehi:RuralMunicipality",
    ]);
    // A null side of the bilingual title must not become a "null" string.
    expect(res.entities[0].name).toEqual({ en: "Sunil Smriti Rural Municipality" });
  });

  it("translates the list's offset into a search page", async () => {
    responses.get = [{ data: { count: 0, results: [] } }];
    await listEntities({ query: "poudel", limit: 50, offset: 100 });
    const params = new URLSearchParams(calls[0].url.split("?")[1]);
    expect(params.get("page")).toBe("3");
    expect(params.get("page_size")).toBe("50");
  });

  it("returns the rows asked for when the offset is not page-aligned", async () => {
    // No search page *starts* at offset 25, so flooring to page 1 would answer
    // with rows 0-49 while reporting offset 25. Read page 1 and slice it.
    responses.get = [{ data: { count: 300, results: page(0, 50) } }];
    const res = await listEntities({ query: "p", limit: 2, offset: 25 });
    const params = new URLSearchParams(calls[0].url.split("?")[1]);
    expect(params.get("page")).toBe("1");
    expect(params.get("page_size")).toBe("50");
    expect(res.entities.map((e) => e["@id"])).toEqual([
      "https://jawafdehi.org/entity/person/p-25",
      "https://jawafdehi.org/entity/person/p-26",
    ]);
    expect(res.offset).toBe(25);
    expect(res.total).toBe(300);
  });

  it("never asks for a page_size the endpoint rejects", async () => {
    // /api/search/ 400s on page_size > 50 (verified against prod), so a wide
    // window must be assembled from whole pages, not requested in one shot.
    responses.get = [
      { data: { count: 300, results: page(0, 50) } },
      { data: { count: 300, results: page(50, 50) } },
    ];
    const res = await listEntities({ query: "p", limit: 100, offset: 0 });
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      const p = new URLSearchParams(c.url.split("?")[1]);
      expect(Number(p.get("page_size"))).toBeLessThanOrEqual(50);
    }
    expect(
      calls.map((c) => new URLSearchParams(c.url.split("?")[1]).get("page")),
    ).toEqual(["1", "2"]);
    expect(res.entities).toHaveLength(100);
    expect(res.entities[99]["@id"]).toBe(
      "https://jawafdehi.org/entity/person/p-99",
    );
  });

  it("spans two pages when an unaligned window straddles a page boundary", async () => {
    responses.get = [
      { data: { count: 300, results: page(0, 50) } },
      { data: { count: 300, results: page(50, 50) } },
    ];
    const res = await listEntities({ query: "p", limit: 10, offset: 45 });
    expect(calls).toHaveLength(2);
    expect(res.entities.map((e) => e["@id"])).toEqual(
      Array.from(
        { length: 10 },
        (_, i) => `https://jawafdehi.org/entity/person/p-${45 + i}`,
      ),
    );
  });

  it("trims the query on the prefix-scoped /api/entities route too", async () => {
    await listEntities({ query: "  dhami  ", entity_prefix: "person" });
    expect(calls[0].url).toBe("/api/entities");
    expect(calls[0].body).toMatchObject({
      params: { query: "dhami", entity_prefix: "person" },
    });
  });

  it("treats a whitespace-only query as unfiltered browsing", async () => {
    // `query=""` would filter on the empty string rather than browse.
    await listEntities({ query: "   ", limit: 10 });
    expect(calls[0].url).toBe("/api/entities");
    const sent = (calls[0].body as { params: Record<string, unknown> }).params;
    expect(sent).not.toHaveProperty("query");
  });

  it("passes entity_type through as a search facet", async () => {
    responses.get = [{ data: { count: 0, results: [] } }];
    await listEntities({ query: "poudel", entity_type: "Person" });
    const params = new URLSearchParams(calls[0].url.split("?")[1]);
    expect(params.get("entity_type")).toBe("Person");
  });

  it("tolerates an empty search response", async () => {
    responses.get = [{ data: {} }];
    const res = await listEntities({ query: "zzzqqx" });
    expect(res.entities).toEqual([]);
    expect(res.total).toBe(0);
  });
});

// Wave-2: optimistic concurrency (If-Match / ETag), transition reason header,
// and the case history endpoint.
describe("admin-api case optimistic concurrency + history", () => {
  it("getCaseWithEtag returns the ETag response header", async () => {
    responses.get = [{ data: { slug: "x" }, headers: { etag: '"abc123"' } }];
    const { data, etag } = await getCaseWithEtag("x");
    expect(data).toMatchObject({ slug: "x" });
    expect(etag).toBe('"abc123"');
  });

  it("getCaseWithEtag returns null etag when the header is absent", async () => {
    responses.get = [{ data: { slug: "x" }, headers: {} }];
    const { etag } = await getCaseWithEtag("x");
    expect(etag).toBeNull();
  });

  it("patchCase sends If-Match and X-Transition-Reason when provided", async () => {
    await patchCase("case-1", [{ op: "replace", path: "/state", value: "DRAFT" }], {
      ifMatch: '"tok1"',
      transitionReason: "needs a second source",
    });
    expect(calls[0]).toMatchObject({ method: "patch", url: "/api/cases/case-1/" });
    const cfg = calls[0].config as { headers: Record<string, string> };
    expect(cfg.headers["If-Match"]).toBe('"tok1"');
    expect(cfg.headers["X-Transition-Reason"]).toBe("needs a second source");
  });

  it("patchCase omits the config entirely when no opts are given", async () => {
    await patchCase("case-1", [{ op: "replace", path: "/title", value: "X" }]);
    expect(calls[0].config).toBeUndefined();
  });

  it("patchCase maps a 412 to CaseConflictError", async () => {
    responses.patch = [{ status: 412, data: { detail: "changed" } }];
    await expect(
      patchCase("case-1", [{ op: "replace", path: "/title", value: "X" }]),
    ).rejects.toBeInstanceOf(CaseConflictError);
  });

  it("patchCase maps a 409 to CaseConflictError too", async () => {
    responses.patch = [{ status: 409, data: {} }];
    await expect(
      patchCase("case-1", [{ op: "replace", path: "/title", value: "X" }]),
    ).rejects.toBeInstanceOf(CaseConflictError);
  });

  it("patchCase rethrows non-conflict errors unchanged", async () => {
    responses.patch = [{ status: 422, data: { detail: "bad" } }];
    await expect(
      patchCase("case-1", [{ op: "replace", path: "/title", value: "X" }]),
    ).rejects.not.toBeInstanceOf(CaseConflictError);
  });

  it("patchCaseWithEtag returns the fresh ETag on success", async () => {
    responses.patch = [{ data: { slug: "x" }, headers: { etag: '"tok2"' } }];
    const { etag } = await patchCaseWithEtag("x", [
      { op: "replace", path: "/title", value: "X" },
    ]);
    expect(etag).toBe('"tok2"');
  });

  it("getCaseHistory hits /history/ and unwraps a paginated envelope", async () => {
    responses.get = [
      { data: { count: 1, next: null, previous: null, results: [{ id: 1 }] } },
    ];
    const rows = await getCaseHistory("case-1");
    expect(calls[0].url).toBe("/api/cases/case-1/history/");
    expect(rows).toEqual([{ id: 1 }]);
  });

  it("getCaseHistory tolerates a bare array response", async () => {
    responses.get = [{ data: [{ id: 2 }] }];
    const rows = await getCaseHistory("case-1");
    expect(rows).toEqual([{ id: 2 }]);
  });

  it("getCaseHistory returns [] when the endpoint errors (older backend)", async () => {
    responses.get = [{ status: 404, data: {} }];
    const rows = await getCaseHistory("case-1");
    expect(rows).toEqual([]);
  });
});
