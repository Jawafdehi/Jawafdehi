// The seam the build's token travels through, and the guard that decides
// whether a server-side request carries one at all.
//
// The consequential assertion is the last describe block: a BROWSER must never
// pick up the build's token. It cannot in practice — nothing calls
// setPrerenderToken in the client bundle — but the store is module-global, so
// the guard that keeps it to the server is worth pinning.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  getEdgeSecret,
  getPrerenderToken,
  setEdgeSecret,
  setPrerenderToken,
} from "@/services/prerender-auth";

beforeEach(() => {
  setPrerenderToken(null);
});

describe("the prerender token store", () => {
  it("starts empty, so an unconfigured build is anonymous", () => {
    expect(getPrerenderToken()).toBeNull();
  });

  it("round-trips a token", () => {
    setPrerenderToken("tok-abc");
    expect(getPrerenderToken()).toBe("tok-abc");
  });

  it("treats an empty or whitespace value as anonymous", () => {
    // An unset CI variable arrives as "" rather than undefined, and a bearer
    // header of `Bearer ` is a 401 dressed up as authentication.
    setPrerenderToken("");
    expect(getPrerenderToken()).toBeNull();
    setPrerenderToken("   ");
    expect(getPrerenderToken()).toBeNull();
  });

  it("trims, so a stray newline from an env var does not reach the header", () => {
    setPrerenderToken("tok-abc\n");
    expect(getPrerenderToken()).toBe("tok-abc");
  });

  it("can be cleared", () => {
    setPrerenderToken("tok-abc");
    setPrerenderToken(null);
    expect(getPrerenderToken()).toBeNull();
  });
});

describe("oidc-session getAccessToken", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns the build's token when there is no window", async () => {
    vi.stubGlobal("window", undefined);
    vi.resetModules();
    const store = await import("@/services/prerender-auth");
    store.setPrerenderToken("tok-build");
    const { getAccessToken } = await import("@/services/oidc-session");

    await expect(getAccessToken()).resolves.toBe("tok-build");
  });

  it("returns null server-side when the build is anonymous", async () => {
    vi.stubGlobal("window", undefined);
    vi.resetModules();
    const store = await import("@/services/prerender-auth");
    store.setPrerenderToken(null);
    const { getAccessToken } = await import("@/services/oidc-session");

    await expect(getAccessToken()).resolves.toBeNull();
  });

  it("does NOT hand the build's token to a browser with no session", async () => {
    // The regression that would matter: a visitor's requests going out with the
    // build's bearer attached.
    vi.resetModules();
    const store = await import("@/services/prerender-auth");
    store.setPrerenderToken("tok-build");
    const { getAccessToken } = await import("@/services/oidc-session");

    await expect(getAccessToken()).resolves.toBeNull();
  });
});

describe("the edge SSR throttle secret", () => {
  afterEach(() => {
    setEdgeSecret(null);
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("starts empty and treats blank as unset", () => {
    expect(getEdgeSecret()).toBeNull();
    setEdgeSecret("  ");
    expect(getEdgeSecret()).toBeNull();
  });

  it("round-trips and trims", () => {
    setEdgeSecret("edge-s3cret\n");
    expect(getEdgeSecret()).toBe("edge-s3cret");
  });

  async function headersSent(secret: string | null): Promise<Record<string, unknown>> {
    vi.resetModules();
    const store = await import("@/services/prerender-auth");
    store.setPrerenderToken(null);
    store.setEdgeSecret(secret);
    const { http } = await import("@/services/http");
    let seen: Record<string, unknown> = {};
    await http.get("/api/x", {
      adapter: async (config) => {
        seen = { ...(config.headers as Record<string, unknown>) };
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      },
    });
    return seen;
  }

  it("is sent on server-side (no window) API calls", async () => {
    vi.stubGlobal("window", undefined);
    const headers = await headersSent("edge-s3cret");
    expect(headers["X-Jawafdehi-Edge-Secret"]).toBe("edge-s3cret");
  });

  it("is NOT sent from a browser even if set", async () => {
    const headers = await headersSent("edge-s3cret");
    expect(headers["X-Jawafdehi-Edge-Secret"]).toBeUndefined();
  });

  it("is not sent when unset", async () => {
    vi.stubGlobal("window", undefined);
    const headers = await headersSent(null);
    expect(headers["X-Jawafdehi-Edge-Secret"]).toBeUndefined();
  });
});
