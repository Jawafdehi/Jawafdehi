// The thin session probe in oidc-session.ts reads the localStorage key that
// oidc-client-ts writes, WITHOUT importing the library. That only works while
// the hand-derived key matches the library's real one, so this test pins the
// two together: an oidc-client-ts upgrade that moves the key fails here instead
// of silently signing every staff member out of the token fast path.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";

import {
  OIDC_AUTHORITY,
  OIDC_CLIENT_ID,
  OIDC_USER_STORAGE_KEY,
  hasStoredOidcSession,
  getAccessToken,
} from "@/services/oidc-session";

// getAccessToken's signed-in branch dynamically imports ./oidc; mock it so the
// test controls the delegation without constructing a real UserManager.
vi.mock("@/services/oidc", () => ({ getAccessToken: vi.fn() }));
import { getAccessToken as realGetAccessToken } from "@/services/oidc";

afterEach(() => {
  window.localStorage.clear();
  vi.mocked(realGetAccessToken).mockReset();
});

describe("OIDC_USER_STORAGE_KEY", () => {
  it("matches the key oidc-client-ts actually writes the user under", async () => {
    // Build a UserManager exactly like ./oidc does (same authority/client_id,
    // localStorage-backed store with the default "oidc." prefix) and store a
    // user through the library's own API.
    const um = new UserManager({
      authority: OIDC_AUTHORITY,
      client_id: OIDC_CLIENT_ID,
      redirect_uri: "https://example.org/admin/callback",
      userStore: new WebStorageStateStore({ store: window.localStorage }),
    });

    const user = {
      access_token: "tok",
      token_type: "Bearer",
      profile: { sub: "s", iss: "i", aud: "a", exp: 0, iat: 0 },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      toStorageString: () => JSON.stringify({ access_token: "tok" }),
    };
    await um.storeUser(user as never);

    expect(window.localStorage.getItem(OIDC_USER_STORAGE_KEY)).not.toBeNull();
    expect(hasStoredOidcSession()).toBe(true);
  });
});

describe("getAccessToken", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("resolves null for anonymous visitors without touching the OIDC module", async () => {
    await expect(getAccessToken()).resolves.toBeNull();
    expect(realGetAccessToken).not.toHaveBeenCalled();
  });

  it("delegates to the real implementation when a session is persisted", async () => {
    window.localStorage.setItem(OIDC_USER_STORAGE_KEY, "{}");
    vi.mocked(realGetAccessToken).mockResolvedValue("bearer-token");

    await expect(getAccessToken()).resolves.toBe("bearer-token");
    expect(realGetAccessToken).toHaveBeenCalledTimes(1);
  });
});
