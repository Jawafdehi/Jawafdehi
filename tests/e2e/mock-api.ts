// Mock Jawafdehi monolith for headless-browser (Playwright) E2E runs.
//
// Serves captured production fixtures (tests/e2e/fixtures/*.json — all public,
// read-plane responses) on the Vite dev-proxy target port, with writes applied
// to an in-memory overlay so admin PATCH/PUT/POST flows round-trip without a
// real backend. Auth is the DEV_AUTH session flow: run the SPA with
// VITE_DEV_AUTH=true and log in through /api/casework/auth/dev-login/.
//
//   bun tests/e2e/mock-api.ts            # listens on 127.0.0.1:48000
//   MOCK_API_PORT=48010 bun tests/e2e/mock-api.ts
import { join } from "node:path";

const PORT = Number(process.env.MOCK_API_PORT || 48000);
const FIXTURES = join(import.meta.dir, "fixtures");

async function fixture<T = unknown>(name: string): Promise<T> {
  return (await Bun.file(join(FIXTURES, name)).json()) as T;
}

type Json = Record<string, unknown>;
interface Paginated {
  count?: number;
  next: string | null;
  previous: string | null;
  results: Json[];
}

// ---------------------------------------------------------------------------
// In-memory stores seeded from fixtures (writes mutate these, never the files).
// ---------------------------------------------------------------------------
const casesList = await fixture<Paginated>("cases-list.json");
const caseDetail = await fixture<Json>("case-patanjali.json");
const materialsList = await fixture<Paginated>("materials-list.json");
const statistics = await fixture<Json>("statistics.json");
const entitiesList = await fixture<Json>("entities-list.json");
const courtCase = await fixture<Json>("courtcase-081-CR-0107.json");
const courtCaseHearings = await fixture<unknown>("courtcase-081-CR-0107-hearings.json");
const courtCaseEntities = await fixture<unknown>("courtcase-081-CR-0107-entities.json");

const casesBySlug = new Map<string, Json>();
for (const c of casesList.results) casesBySlug.set(String(c.slug), c);
casesBySlug.set(String(caseDetail.slug), caseDetail);

// Materials keyed by the `<source>/<ident>` tail of their @id IRI.
const MATERIAL_MARKER = "/material/";
const materialTail = (iri: string) => {
  const i = iri.indexOf(MATERIAL_MARKER);
  return i === -1 ? iri : iri.slice(i + MATERIAL_MARKER.length);
};
const materialsByTail = new Map<string, Json>();
for (const m of materialsList.results) {
  materialsByTail.set(materialTail(String(m["@id"])), m);
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

const emptyPage: Paginated = { count: 0, next: null, previous: null, results: [] };

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();

    // --- DEV_AUTH session ---------------------------------------------------
    if (path === "/api/casework/auth/dev-login/" && method === "POST") {
      return json(
        { username: "e2e-admin", roles: ["Admin"], is_admin: true, csrftoken: "e2e-csrf" },
        200,
        { "Set-Cookie": "sessionid=e2e-session; Path=/; SameSite=Lax" },
      );
    }
    if (path === "/api/casework/auth/dev-logout/" && method === "POST") {
      return new Response(null, { status: 204 });
    }

    // --- casework review surface (admin shell dashboards) -------------------
    if (path.startsWith("/api/casework/reviews")) return json(emptyPage);
    if (path === "/api/casework/rules/") return json([]);
    if (path === "/api/casework/config/") return json({});

    // --- statistics + entities ----------------------------------------------
    if (path === "/api/statistics/") return json(statistics);
    if (path === "/api/entities" || path === "/api/entities/") return json(entitiesList);
    if (path === "/api/entity_prefixes") return json({ prefixes: [] });

    // --- jawafdehi cases ------------------------------------------------------
    if (path === "/api/cases/" && method === "GET") {
      let results = [...casesBySlug.values()];
      const state = url.searchParams.get("state");
      if (state) results = results.filter((c) => c.state === state);
      const pageSize = Number(url.searchParams.get("page_size") || 0);
      const count = results.length;
      if (pageSize > 0) results = results.slice(0, pageSize);
      return json({ count, next: null, previous: null, results });
    }
    if (path === "/api/cases/" && method === "POST") {
      const body = (await req.json()) as Json;
      const slug = String(body.slug || `case-e2e-${casesBySlug.size + 1}`);
      const created = { ...caseDetail, ...body, slug, state: "DRAFT", id: 90000 + casesBySlug.size };
      casesBySlug.set(slug, created);
      return json(created, 201);
    }
    const caseMatch = path.match(/^\/api\/cases\/([^/]+)\/$/);
    if (caseMatch) {
      const slug = decodeURIComponent(caseMatch[1]);
      const existing = casesBySlug.get(slug);
      if (!existing) return json({ detail: "Not found." }, 404);
      if (method === "GET") return json(existing);
      if (method === "PATCH") {
        // Case updates are RFC-6902: a bare array of {op, path, value}. Only
        // top-level replace is applied (all the SPA emits). A plain object
        // body merges shallowly.
        const body = (await req.json()) as Json | Array<Json>;
        const updated: Json = { ...existing, updated_at: "2026-07-03T00:00:00Z" };
        if (Array.isArray(body)) {
          for (const op of body) {
            if (op.op === "replace" && typeof op.path === "string") {
              updated[(op.path as string).replace(/^\//, "")] = op.value;
            }
          }
        } else {
          Object.assign(updated, body);
        }
        casesBySlug.set(slug, updated);
        return json(updated);
      }
      if (method === "DELETE") {
        casesBySlug.delete(slug);
        return new Response(null, { status: 204 });
      }
    }

    // --- data-lake materials -------------------------------------------------
    if (path === "/api/materials/" && method === "GET") {
      const iri = url.searchParams.get("iri");
      if (iri) {
        const m = materialsByTail.get(materialTail(iri));
        return m ? json(m) : json({ detail: "Not found." }, 404);
      }
      return json({ next: null, previous: null, results: [...materialsByTail.values()] });
    }
    if (path === "/api/materials/" && method === "POST") {
      const body = (await req.json()) as Json;
      const doc = (body.material as Json) ?? body;
      const tail = materialTail(String(doc["@id"] ?? ""));
      if (!tail) return json({ detail: "@id required" }, 400);
      materialsByTail.set(tail, doc);
      return json(doc, 201);
    }
    const materialMatch = path.match(/^\/api\/materials\/(.+?)\/?$/);
    if (materialMatch) {
      const tail = decodeURIComponent(materialMatch[1]).replace(/\/file$/, "");
      if (path.endsWith("/file") && method === "POST") {
        const m = materialsByTail.get(tail);
        return m ? json(m) : json({ detail: "Not found." }, 404);
      }
      const m = materialsByTail.get(tail);
      if (!m) return json({ detail: "Not found." }, 404);
      if (method === "GET") return json(m);
      if (method === "PUT") {
        const body = (await req.json()) as Json;
        materialsByTail.set(tail, body);
        return json(body);
      }
      if (method === "DELETE") {
        materialsByTail.delete(tail);
        return new Response(null, { status: 204 });
      }
    }

    // --- data-lake court cases ----------------------------------------------
    if (path === "/api/courtcases/" && method === "GET") return json(emptyPage);
    if (path.startsWith("/api/courtcases/special/081-CR-0107")) {
      if (path.endsWith("/hearings")) return json(courtCaseHearings);
      if (path.endsWith("/entities")) return json(courtCaseEntities);
      if (path.endsWith("/documents")) return json(emptyPage);
      return json(courtCase);
    }
    if (path.startsWith("/api/courtcases/")) return json({ detail: "Not found." }, 404);
    if (path === "/api/courts/" || path === "/api/firms/") return json(emptyPage);

    // --- misc ----------------------------------------------------------------
    if (path === "/api/health") return json({ status: "ok" });
    if (path === "/api/feedback/") return json({ ok: true }, 201);
    if (path.startsWith("/api/cms")) return json({ items: [], meta: { total_count: 0 } });

    console.log(`[mock-api] UNHANDLED ${method} ${path}${url.search}`);
    return json({ detail: `mock-api: unhandled ${method} ${path}` }, 404);
  },
});

console.log(`[mock-api] listening on http://127.0.0.1:${PORT}`);
