import { describe, it, expect, vi, beforeEach } from "vitest";

// The OIDC token fetch touches the browser UserManager; stub it so the request
// interceptor is inert in tests.
vi.mock("./oidc", () => ({ getAccessToken: vi.fn().mockResolvedValue(null) }));

// Capture what the shared axios instance is asked to fetch (mirrors
// admin-api.test.ts). Each verb records its (url, params/body) and resolves an
// empty body so the wrappers just relay the shape.
const { calls } = vi.hoisted(() => ({
  calls: [] as { method: string; url: string; body?: unknown; config?: unknown }[],
}));

vi.mock("axios", () => {
  const record =
    (method: string) =>
    (url: string, body?: unknown, config?: unknown) => {
      calls.push({ method, url, body, config });
      // GET signature is (url, config); POST is (url, body, config).
      return Promise.resolve({ data: { id: 7 }, headers: {} });
    };
  const instance = {
    get: (url: string, config?: unknown) => {
      calls.push({ method: "get", url, config });
      return Promise.resolve({ data: { count: 0, next: null, previous: null, results: [] }, headers: {} });
    },
    post: record("post"),
    put: record("put"),
    patch: record("patch"),
    delete: record("delete"),
    interceptors: { request: { use: () => undefined } },
  };
  return { default: { create: () => instance } };
});

import { submitReview, listReviews } from "./casework-api";

beforeEach(() => {
  calls.length = 0;
});

describe("submitReview", () => {
  it("POSTs the case slug to the submit endpoint", async () => {
    await submitReview({ slug: "case-081-cr-0136-oxygen-plant" });
    expect(calls[0]).toMatchObject({
      method: "post",
      url: "/api/casework/reviews/submit/",
      body: { slug: "case-081-cr-0136-oxygen-plant" },
    });
  });
});

describe("listReviews", () => {
  it("scopes the flat list to one case via ?slug=", async () => {
    await listReviews({ slug: "case-a", page_size: 100 });
    expect(calls[0].method).toBe("get");
    expect(calls[0].url).toBe("/api/casework/reviews/");
    expect(calls[0].config).toMatchObject({ params: { slug: "case-a", page_size: 100 } });
  });
});
