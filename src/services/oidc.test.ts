import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `oidc.ts` builds its UserManager at first use and reads `window.location.origin`
// while doing so, so the manager is mocked wholesale and the module re-imported
// per test to reset its singleton and its in-flight-renewal latch.
const signinSilent = vi.fn();
const getUser = vi.fn();

// Plain `function`, not an arrow: `oidc.ts` calls `new UserManager(...)`, and an
// arrow function cannot be constructed.
vi.mock("oidc-client-ts", () => ({
  UserManager: vi.fn(function () {
    return { getUser, signinSilent };
  }),
  WebStorageStateStore: vi.fn(function () {
    return {};
  }),
}));

async function loadModule() {
  vi.resetModules();
  return await import("@/services/oidc");
}

beforeEach(() => {
  getUser.mockReset();
  signinSilent.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAccessToken", () => {
  it("returns the stored token while it is still valid", async () => {
    getUser.mockResolvedValue({ expired: false, access_token: "live-token" });
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBe("live-token");
    expect(signinSilent).not.toHaveBeenCalled();
  });

  it("refreshes an expired token instead of falling back to anonymous", async () => {
    // The regression this guards: returning null here dropped the Authorization
    // header, so the API answered 200 with the casework-gated fields stripped and
    // the page silently changed content instead of reporting a lapsed session.
    getUser.mockResolvedValue({
      expired: true,
      access_token: "dead-token",
      refresh_token: "refresh-token",
    });
    signinSilent.mockResolvedValue({ expired: false, access_token: "fresh-token" });
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBe("fresh-token");
    expect(signinSilent).toHaveBeenCalledTimes(1);
  });

  it("never attempts a renewal without a refresh token", async () => {
    // signinSilent() would fall back to a hidden-iframe authorization request,
    // which Zitadel blocks with frame-ancestors 'none' — it can only hang.
    getUser.mockResolvedValue({ expired: true, access_token: "dead-token" });
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBeNull();
    expect(signinSilent).not.toHaveBeenCalled();
  });

  it("coalesces concurrent callers into ONE refresh grant", async () => {
    // Zitadel rotates refresh tokens: parallel grants racing on the same token
    // fail, and reuse-detection can revoke the chain outright. A page load fires
    // a burst of requests and the interceptor calls this on every one of them.
    getUser.mockResolvedValue({
      expired: true,
      access_token: "dead-token",
      refresh_token: "refresh-token",
    });
    let release!: (user: unknown) => void;
    signinSilent.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { getAccessToken } = await loadModule();

    const pending = Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);
    release({ expired: false, access_token: "fresh-token" });

    expect(await pending).toEqual(["fresh-token", "fresh-token", "fresh-token"]);
    expect(signinSilent).toHaveBeenCalledTimes(1);
  });

  it("reports anonymous when the refresh token is expired or revoked", async () => {
    getUser.mockResolvedValue({
      expired: true,
      access_token: "dead-token",
      refresh_token: "revoked",
    });
    signinSilent.mockRejectedValue(new Error("invalid_grant"));
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBeNull();
  });

  it("retries the grant on a later call rather than latching the failure", async () => {
    getUser.mockResolvedValue({
      expired: true,
      access_token: "dead-token",
      refresh_token: "refresh-token",
    });
    signinSilent
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ expired: false, access_token: "fresh-token" });
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBeNull();
    expect(await getAccessToken()).toBe("fresh-token");
  });

  it("returns null under SSR without constructing a UserManager", async () => {
    // Load-bearing for `bun run scripts/pre-render.ts`: pre-rendered HTML is
    // served to everyone, so it must only ever hold anonymously-fetched data.
    vi.stubGlobal("window", undefined);
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });
});
