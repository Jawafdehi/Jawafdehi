import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useIsLoggedIn } from "@/hooks/use-is-logged-in";

// The hook reads the persisted session directly (public pages sit outside the
// admin auth providers), so mock both sources. It asks `getAccessToken` — the
// same "is there a usable token" question the request interceptor asks — rather
// than reading the stored user, so an expired-but-refreshable session counts as
// logged in here exactly as it does on the wire.
vi.mock("@/services/dev-auth", () => ({ getStoredDevUser: vi.fn() }));
vi.mock("@/services/oidc", () => ({ getAccessToken: vi.fn() }));

import { getStoredDevUser } from "@/services/dev-auth";
import { getAccessToken } from "@/services/oidc";

beforeEach(() => {
  vi.mocked(getStoredDevUser).mockReset().mockReturnValue(null);
  vi.mocked(getAccessToken).mockReset().mockResolvedValue(null);
});

describe("useIsLoggedIn", () => {
  it("is false with no dev-auth and no OIDC session", async () => {
    const { result } = renderHook(() => useIsLoggedIn());
    // Let the async OIDC lookup settle; it must resolve to logged-out.
    await act(async () => {});
    expect(getAccessToken).toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("is true when a dev-auth session is stored, without touching OIDC", () => {
    vi.mocked(getStoredDevUser).mockReturnValue({
      username: "admin",
      roles: [],
      is_admin: true,
    } as never);
    const { result } = renderHook(() => useIsLoggedIn());
    expect(result.current).toBe(true);
    // Dev-auth short-circuits before the OIDC manager is consulted.
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it("is true when a usable access token is available", async () => {
    vi.mocked(getAccessToken).mockResolvedValue("jwt-token");
    const { result } = renderHook(() => useIsLoggedIn());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays false when the session cannot produce a token", async () => {
    // getAccessToken has already tried the refresh grant and come back empty —
    // an expired token with no usable refresh token is genuinely logged out.
    vi.mocked(getAccessToken).mockResolvedValue(null);
    const { result } = renderHook(() => useIsLoggedIn());
    await act(async () => {});
    expect(getAccessToken).toHaveBeenCalled();
    expect(result.current).toBe(false);
  });
});
