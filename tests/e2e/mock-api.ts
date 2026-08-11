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

// ---------------------------------------------------------------------------
// Casework reviews (in-memory). submit appends a fresh run; the store stays
// newest-first so grouping and the flat ?slug= list mirror the real backend's
// -created_at ordering.
// ---------------------------------------------------------------------------
let reviewSeq = 500;
const reviews: Json[] = [];

function makeResult(slug: string, title: string, score: number, disposition: string): Json {
  const rule = (key: string, ruleTitle: string, category: string, kind: string, sc: number) => ({
    key,
    title: ruleTitle,
    category,
    kind,
    condition_text: "",
    applies_to: [],
    weight: 1,
    is_gate: false,
    gate_min: 0,
    gate_failed: false,
    score: sc,
    confidence: "high",
    variance: 0,
    std: 0,
    issues: [],
    notes: [],
    suggestions: [],
    rationale: "Deterministic check passed.",
    description: "",
    good_examples: "",
    bad_examples: "",
  });
  return {
    slug,
    title,
    state: "IN_REVIEW",
    case_type: { type: "criminal", label: "Criminal", rationale: "" },
    overall_score: score,
    disposition,
    // Three categories so the detail radar chart (>= 3 axes) renders.
    rules: [
      rule("has_sources", "Sources attached", "Evidence", "deterministic", 100),
      rule("summary_quality", "Summary quality", "Narrative", "llm", score),
      rule("entity_coverage", "Entity coverage", "Entities", "llm", Math.max(0, score - 3)),
    ],
    categories: [
      { category: "Evidence", score: 100, rules: 1 },
      { category: "Narrative", score, rules: 1 },
      { category: "Entities", score: Math.max(0, score - 3), rules: 1 },
    ],
    gate_failures: [],
    gates_pass: true,
    narrative: `Automated review summary for ${title}.`,
    info: [],
    judge_error: null,
    llm_samples: 3,
    thresholds: { pass: 80, revise: 60 },
    model_id_used: "anthropic/opus-4.8",
    source_summary: [
      {
        title: "Charge sheet",
        source_type: "pdf",
        conversion_status: "converted",
        conversion_note: "",
        markdown_chars: 1234,
        markdown: "# Charge sheet\n\nBody text.",
        url: [],
      },
    ],
  };
}

function makeReview(slug: string, title: string, score: number, disposition: string): Json {
  const id = ++reviewSeq;
  return {
    id,
    slug,
    case_title: title,
    status: "done",
    stage: "done",
    case_state: "IN_REVIEW",
    case_type: "criminal",
    source_count: 1,
    sources_converted: 1,
    overall_score: score,
    disposition,
    reviewers: [{ tier: "premium", provider: "anthropic", model: "opus-4.8", calls: 3 }],
    created_at: "2026-07-13T10:00:00Z",
    completed_at: "2026-07-13T10:01:00Z",
    started_at: "2026-07-13T10:00:05Z",
    updated_at: "2026-07-13T10:01:00Z",
    duration_seconds: 61,
    error: "",
    result: makeResult(slug, title, score, disposition),
  };
}

// Seed one case with two runs so the list shows a case row and the per-case
// page shows a run history out of the box.
{
  const seedSlug = String(caseDetail.slug);
  const seedTitle = String(caseDetail.title || seedSlug);
  reviews.unshift(makeReview(seedSlug, seedTitle, 74, "REVISE"));
  reviews.unshift(makeReview(seedSlug, seedTitle, 88, "PASS"));
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
        { username: "e2e-admin", roles: [], is_admin: true, csrftoken: "e2e-csrf" },
        200,
        { "Set-Cookie": "sessionid=e2e-session; Path=/; SameSite=Lax" },
      );
    }
    if (path === "/api/casework/auth/dev-logout/" && method === "POST") {
      return new Response(null, { status: 204 });
    }

    // --- casework reviews ---------------------------------------------------
    // Grouped list: one entry per case (all its runs), newest-case-first.
    if (path === "/api/casework/reviews/grouped/" && method === "GET") {
      const bySlug = new Map<string, Json[]>();
      for (const r of reviews) {
        const s = String(r.slug);
        if (!bySlug.has(s)) bySlug.set(s, []);
        bySlug.get(s)!.push(r);
      }
      const results = [...bySlug.entries()].map(([s, execs]) => ({
        slug: s,
        case_title: execs[0].case_title,
        latest: execs[0],
        executions: execs,
      }));
      return json({ count: results.length, next: null, previous: null, results });
    }
    // Submit: append a fresh run for the case named by slug (or a /case/ IRI).
    if (path === "/api/casework/reviews/submit/" && method === "POST") {
      const body = (await req.json()) as Json;
      let slug = typeof body.slug === "string" ? body.slug : "";
      if (!slug && typeof body.iri === "string") {
        const m = body.iri.match(/\/case\/([^/]+)\/?$/);
        if (m) slug = decodeURIComponent(m[1]);
      }
      if (!slug) return json({ detail: "slug or iri required" }, 400);
      const c = casesBySlug.get(slug);
      const title = c ? String(c.title || slug) : slug;
      const review = makeReview(slug, title, 91, "PASS");
      reviews.unshift(review);
      return json(review, 201);
    }
    if (path === "/api/casework/reviews/regrade-all/" && method === "POST") {
      return json({ regrading: 0, review_ids: [] });
    }
    const reviewIdMatch = path.match(/^\/api\/casework\/reviews\/(\d+)\/$/);
    if (reviewIdMatch && method === "GET") {
      const id = Number(reviewIdMatch[1]);
      const r = reviews.find((x) => x.id === id);
      return r ? json(r) : json({ detail: "Not found." }, 404);
    }
    // Flat list, optionally scoped to one case's runs via ?slug=.
    if (path === "/api/casework/reviews/" && method === "GET") {
      const slug = url.searchParams.get("slug");
      const results = slug ? reviews.filter((r) => r.slug === slug) : reviews;
      return json({ count: results.length, next: null, previous: null, results });
    }
    // Defensive: any other casework review path.
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
      // Full-text search: the real /api/cases/ searches title/description/
      // key_allegations. The mock adds slug too (harmless superset) so tests can
      // type an ASCII token even when titles are Devanagari.
      const search = url.searchParams.get("search");
      if (search) {
        const q = search.toLowerCase();
        results = results.filter((c) =>
          [c.title, c.slug, c.description, c.key_allegations]
            .some((v) => String(v ?? "").toLowerCase().includes(q)),
        );
      }
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
      let existing = casesBySlug.get(slug);
      // Court-ref identifier lookup (`<court>:<number>`), mirroring the real
      // API: resolves the case whose court_cases IRI matches, case-insensitively.
      if (!existing) {
        const refMatch = slug.match(/^([a-z]+):(.+)$/i);
        if (refMatch) {
          const iriTail = `/courtcase/${refMatch[1]}/${refMatch[2]}`.toLowerCase();
          existing = [...casesBySlug.values()].find((c) =>
            (c.court_cases as string[] | null | undefined)?.some(
              (ref) => typeof ref === "string" && ref.toLowerCase().endsWith(iriTail),
            ),
          );
        }
      }
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
    // Case number segment matched case-insensitively: court-case @id IRIs carry
    // it lowercased while the captured fixture (and display) use uppercase.
    if (path.toLowerCase().startsWith("/api/courtcases/special/081-cr-0107")) {
      if (path.endsWith("/hearings")) return json(courtCaseHearings);
      if (path.endsWith("/entities")) return json(courtCaseEntities);
      if (path.endsWith("/documents")) return json(emptyPage);
      return json(courtCase);
    }
    if (path.startsWith("/api/courtcases/")) return json({ detail: "Not found." }, 404);
    if (path === "/api/courts/" || path === "/api/firms/") return json(emptyPage);

    // --- misc ----------------------------------------------------------------
    if (path === "/api/health") return json({ status: "ok" });
    if (path === "/api/feedback/")
      return json(
        {
          id: 4242,
          feedbackType: "general",
          subject: "",
          status: "new",
          submittedAt: "2026-08-10T00:00:00Z",
          message: "Thank you for your submission.",
        },
        201,
      );
    if (path.startsWith("/api/cms")) return json({ items: [], meta: { total_count: 0 } });

    console.log(`[mock-api] UNHANDLED ${method} ${path}${url.search}`);
    return json({ detail: `mock-api: unhandled ${method} ${path}` }, 404);
  },
});

console.log(`[mock-api] listening on http://127.0.0.1:${PORT}`);
