// The seam the build's token travels through, and the guard that decides
// whether a server-side request carries one at all.
//
// The consequential assertion is the last describe block: a BROWSER must never
// pick up the build's token. It cannot in practice — nothing calls
// setPrerenderToken in the client bundle — but the store is module-global, so
// the guard that keeps it to the server is worth pinning.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { getPrerenderToken, setPrerenderToken } from "@/services/prerender-auth";

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
