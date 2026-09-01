import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `oidc.ts` builds its UserManager at first use and reads `window.location.origin`
// while doing so, so the manager is mocked wholesale and the module re-imported
// per test to reset its singleton and its in-flight-renewal latch.
const signinSilent = vi.fn();
const getUser = vi.fn();
let fireExpiring: (() => void) | null = null;

// Plain `function`, not an arrow: `oidc.ts` calls `new UserManager(...)`, and an
// arrow function cannot be constructed.
vi.mock("oidc-client-ts", () => ({
  UserManager: vi.fn(function () {
    return {
      getUser,
      signinSilent,
      events: {
        addAccessTokenExpiring: (cb: () => void) => {
          fireExpiring = cb;
        },
      },
    };
  }),
  WebStorageStateStore: vi.fn(function () {
    return {};
  }),
}));

async function loadModule() {
  vi.resetModules();
  fireExpiring = null;
  return await import("@/services/oidc");
}

/** Flush every pending microtask (the `await getUser()` hops) deterministically. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const EXPIRED_WITH_REFRESH = {
  expired: true,
  access_token: "dead-token",
  refresh_token: "refresh-token",
};

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
    // header, so the API answered 200 with the role-gated fields stripped and the
    // page silently changed content instead of reporting a lapsed session.
    getUser.mockResolvedValue(EXPIRED_WITH_REFRESH);
    signinSilent.mockResolvedValue({ expired: false, access_token: "fresh-token" });
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBe("fresh-token");
    expect(signinSilent).toHaveBeenCalledTimes(1);
  });

  it("never attempts a renewal without a refresh token", async () => {
    // signinSilent() would fall back to a hidden-iframe authorization request,
    // which the IdP's frame-ancestors policy can only leave hanging.
    getUser.mockResolvedValue({ expired: true, access_token: "dead-token" });
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBeNull();
    expect(signinSilent).not.toHaveBeenCalled();
  });

  it("coalesces concurrent callers into ONE refresh grant", async () => {
    // Refresh tokens are rotated: parallel grants on the same token fail, and
    // reuse detection can revoke the chain outright. A page load fires a burst of
    // requests and the interceptor calls this on every one of them.
    getUser.mockResolvedValue(EXPIRED_WITH_REFRESH);
    let release!: (user: unknown) => void;
    let started!: () => void;
    const grantStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    signinSilent.mockImplementation(() => {
      started();
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const { getAccessToken } = await loadModule();

    const pending = Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);
    // Hold the grant genuinely in flight until all three callers have reached
    // the latch. Releasing before that would leave the coalescing untested: the
    // promise would already be settled and whether callers 2 and 3 ever saw it
    // would depend on microtask ordering.
    await grantStarted;
    await settle();
    release({ expired: false, access_token: "fresh-token" });

    expect(await pending).toEqual(["fresh-token", "fresh-token", "fresh-token"]);
    expect(signinSilent).toHaveBeenCalledTimes(1);
  });

  it("reuses a token another tab renewed while we waited for the lock", async () => {
    // What makes the cross-tab lock worth having rather than just a queue: the
    // winner has already stored a fresh token, so granting again would rotate the
    // one it just wrote out from under it.
    const locks = {
      request: vi.fn(async (_name: string, cb: () => Promise<unknown>) => cb()),
    };
    vi.stubGlobal("navigator", { locks });
    getUser
      .mockResolvedValueOnce(EXPIRED_WITH_REFRESH) // the getAccessToken check
      .mockResolvedValueOnce({ expired: false, access_token: "other-tab-token" });
    const { getAccessToken } = await loadModule();

    expect(await getAccessToken()).toBe("other-tab-token");
    expect(locks.request).toHaveBeenCalledTimes(1);
    expect(signinSilent).not.toHaveBeenCalled();
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
    getUser.mockResolvedValue(EXPIRED_WITH_REFRESH);
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

describe("the expiry timer", () => {
  it("renews through the SAME latch as getAccessToken, not a second grant", async () => {
    // automaticSilentRenew is off precisely because the library's
    // SilentRenewService calls signinSilent() directly, which would bypass the
    // latch and let a timer grant race an on-demand one on a rotating token.
    getUser.mockResolvedValue(EXPIRED_WITH_REFRESH);
    let release!: (user: unknown) => void;
    let started!: () => void;
    const grantStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    signinSilent.mockImplementation(() => {
      started();
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const { getAccessToken, getUserManager } = await loadModule();

    getUserManager(); // registers the handler
    expect(fireExpiring).toBeTypeOf("function");

    fireExpiring!(); // timer fires
    await grantStarted;
    const onDemand = getAccessToken(); // a request lands mid-renewal
    await settle();
    release({ expired: false, access_token: "fresh-token" });

    expect(await onDemand).toBe("fresh-token");
    expect(signinSilent).toHaveBeenCalledTimes(1);
  });

  it("swallows a failed timer renewal instead of raising unhandled", async () => {
    getUser.mockResolvedValue(EXPIRED_WITH_REFRESH);
    signinSilent.mockRejectedValue(new Error("invalid_grant"));
    const { getUserManager } = await loadModule();

    getUserManager();
    expect(() => fireExpiring!()).not.toThrow();
    await settle();
  });
});
