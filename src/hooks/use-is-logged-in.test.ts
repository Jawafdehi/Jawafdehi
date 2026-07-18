import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import { useIsLoggedIn } from "@/hooks/use-is-logged-in";

// The hook reads the persisted session directly (public pages sit outside the
// admin auth providers), so mock both sources.
vi.mock("@/services/dev-auth", () => ({ getStoredDevUser: vi.fn() }));
vi.mock("@/services/oidc", () => ({ getUserManager: vi.fn() }));

import { getStoredDevUser } from "@/services/dev-auth";
import { getUserManager } from "@/services/oidc";

const getUser = vi.fn();

beforeEach(() => {
  vi.mocked(getStoredDevUser).mockReset().mockReturnValue(null);
  getUser.mockReset().mockResolvedValue(null);
  vi.mocked(getUserManager)
    .mockReset()
    .mockReturnValue({ getUser } as unknown as ReturnType<typeof getUserManager>);
});

describe("useIsLoggedIn", () => {
  it("is false with no dev-auth and no OIDC session", async () => {
    const { result } = renderHook(() => useIsLoggedIn());
    // Let the async OIDC lookup settle; it must resolve to logged-out.
    await act(async () => {});
    expect(getUser).toHaveBeenCalled();
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
    expect(getUser).not.toHaveBeenCalled();
  });

  it("is true when the OIDC manager has a non-expired user", async () => {
    getUser.mockResolvedValue({ expired: false });
    const { result } = renderHook(() => useIsLoggedIn());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays false when the OIDC user is expired", async () => {
    getUser.mockResolvedValue({ expired: true });
    const { result } = renderHook(() => useIsLoggedIn());
    await act(async () => {});
    expect(getUser).toHaveBeenCalled();
    expect(result.current).toBe(false);
  });
});
