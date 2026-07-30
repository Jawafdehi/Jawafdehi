import { describe, it, expect, vi, beforeEach } from "vitest";

// The OIDC token fetch touches the browser UserManager; stub it so the request
// interceptor is inert in tests.
vi.mock("./oidc", () => ({ getAccessToken: vi.fn().mockResolvedValue(null) }));

// Same spy-client idiom as admin-api.test.ts: `axios.create` returns our
// instance, each verb records its (url, config) and shifts a scripted response
// off a per-method queue so a test can drive multi-page envelopes.
const { calls, responses } = vi.hoisted(() => ({
  calls: [] as { method: string; url: string; config?: unknown }[],
  responses: {} as Record<string, Array<{ data?: unknown; status?: number }>>,
}));

vi.mock("axios", () => {
  const record =
    (method: string) =>
    (url: string, second?: unknown, third?: unknown) => {
      // get(url, config) vs post(url, body, config) — the config is the last arg.
      calls.push({ method, url, config: method === "get" ? second : third });
      const queued = responses[method]?.shift();
      if (queued && typeof queued.status === "number" && queued.status >= 400) {
        return Promise.reject({ response: { status: queued.status, data: queued.data } });
      }
      return Promise.resolve({ data: queued?.data ?? {}, headers: {} });
    };
  const instance = {
    get: record("get"),
    post: record("post"),
    interceptors: { request: { use: () => undefined } },
  };
  return { default: { create: () => instance } };
});

import { listProposals } from "./proposals-api";

// Minimal wire row — only the fields adapt() reads are needed.
function row(id: number) {
  return {
    id,
    case_slug: "lalita-niwas-land-scam",
    case_title: "Lalita Niwas land scam",
    source_kind: "ngm_docket",
    intent: { type: "append_timeline_entry", entry: { date: "2026-08-12", title: "Hearing" } },
    confidence: 0.9,
    status: "pending",
    source: "",
    detected_by: "consumer:proposal-builder",
    dedup_key: `docket:${id}`,
    supersedes: null,
    origin_subject: "",
    origin_msg_id: "",
    subject_refs: [],
    reviewer: null,
    reviewed_at: null,
    review_notes: null,
    created_at: "2026-07-29T00:00:00Z",
  };
}

function page(rows: number[], next: string | null) {
  return { data: { count: 99, next, previous: null, results: rows.map(row) } };
}

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(responses)) delete responses[k];
});

describe("listProposals pagination", () => {
  it("walks every page instead of truncating at the first", async () => {
    // The monolith paginates by default (PAGE_SIZE 20); a queue that stops at
    // page one silently hides pending proposals from the reviewer.
    responses.get = [
      page([1, 2], "https://api.jawafdehi.org/api/case-update-proposals/?page=2"),
      page([3, 4], "https://api.jawafdehi.org/api/case-update-proposals/?page=3"),
      page([5], null),
    ];

    const out = await listProposals();

    expect(out.map((p) => p.id)).toEqual(["1", "2", "3", "4", "5"]);
    expect(calls).toHaveLength(3);
  });

  it("re-requests the relative path with the page cursor, not the absolute next URL", async () => {
    // `next` is built from the request host, which behind the proxy can be an
    // origin the browser shouldn't call — so we reuse the cursor, not the URL.
    responses.get = [
      page([1], "https://internal-origin.invalid/api/case-update-proposals/?page=2&status=pending"),
      page([2], null),
    ];

    await listProposals({ status: "pending" });

    expect(calls.map((c) => c.url)).toEqual([
      "/api/case-update-proposals/",
      "/api/case-update-proposals/",
    ]);
    expect(calls[0].config).toEqual({ params: { status: "pending" } });
    expect(calls[1].config).toEqual({ params: { status: "pending", page: 2 } });
  });

  it("handles an unpaginated array response without looping", async () => {
    responses.get = [{ data: [row(1), row(2)] }];

    const out = await listProposals();

    expect(out.map((p) => p.id)).toEqual(["1", "2"]);
    expect(calls).toHaveLength(1);
  });

  it("stops when next repeats itself rather than looping forever", async () => {
    // A cyclic/never-terminating `next` must not hang the page.
    const selfRef = "https://api.jawafdehi.org/api/case-update-proposals/?page=2";
    responses.get = Array.from({ length: 60 }, () => page([1], selfRef));

    const out = await listProposals();

    expect(calls.length).toBeLessThanOrEqual(50);
    expect(out.length).toBeLessThanOrEqual(50);
  });

  it("normalises nullable reviewer / notes / supersedes", async () => {
    responses.get = [page([1], null)];

    const [p] = await listProposals();

    expect(p.review.reviewer).toBeNull();
    expect(p.review.notes).toBe("");
    expect(p.provenance.supersedes).toBeUndefined();
  });
});
