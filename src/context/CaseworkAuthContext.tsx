import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "react-oidc-context";
import type { CaseworkUser } from "@/types/casework";
import { getUserManager } from "@/services/oidc";
import { isAdmin as rolesIsAdmin, isModerator as rolesIsModerator } from "@/lib/roles";
import {
  DEV_AUTH_ENABLED,
  getStoredDevUser,
  devLogin as devLoginRequest,
  devLogout as devLogoutRequest,
} from "@/services/dev-auth";

interface AuthContextValue {
  user: CaseworkUser | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  isAdmin: boolean;
  // True when the user holds admin OR moderator — the UI gate for privileged
  // actions (state transitions, moderation queue, regrade-all). The API is the
  // authorization authority; this only decides which controls the UI offers.
  isModerator: boolean;
  // DEV-ONLY: whether the username/password login form is available (VITE_DEV_AUTH).
  devAuthEnabled: boolean;
  // DEV-ONLY: authenticate with username/password (Django session). Throws on
  // bad credentials so the login form can surface the error.
  devLogin: (username: string, password: string) => Promise<void>;
}

const CaseworkAuthContext = createContext<AuthContextValue | null>(null);

// Build the portal user straight from the OIDC token claims. `roles` is the
// flattened roles array (role keys, lowercase); the API remains the
// authorization authority — this is only for the header / UI gating.
function toCaseworkUser(
  profile: Record<string, unknown> | undefined,
): CaseworkUser | null {
  if (!profile) return null;
  const roles = Array.isArray(profile.roles)
    ? (profile.roles as unknown[]).filter(
        (r): r is string => typeof r === "string",
      )
    : [];
  const username =
    (profile.email as string) ||
    (profile.preferred_username as string) ||
    (profile.name as string) ||
    "";
  return { username, roles, is_admin: roles.includes("admin") };
}

export function CaseworkAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  // DEV-ONLY session user (username/password). Rehydrated from localStorage so a
  // reload stays logged in. When present it takes precedence over OIDC.
  const [devUser, setDevUser] = useState<CaseworkUser | null>(() =>
    getStoredDevUser(),
  );

  const oidcUser = useMemo(
    () => (auth.isAuthenticated ? toCaseworkUser(auth.user?.profile) : null),
    [auth.isAuthenticated, auth.user?.profile],
  );

  const user = devUser ?? oidcUser;

  const login = () => {
    auth.signinRedirect({
      state: window.location.pathname + window.location.search,
    });
  };

  const devLogin = async (username: string, password: string) => {
    const u = await devLoginRequest(username, password);
    setDevUser(u);
  };

  const logout = () => {
    if (devUser) {
      // End the dev session and drop the local snapshot; stay in the SPA.
      devLogoutRequest().finally(() => {
        setDevUser(null);
        window.location.assign("/admin/login");
      });
      return;
    }
    getUserManager().signoutRedirect();
  };

  return (
    <CaseworkAuthContext.Provider
      value={{
        user,
        loading: auth.isLoading,
        error: auth.error?.message ?? null,
        login,
        logout,
        isAdmin: rolesIsAdmin(user?.roles),
        isModerator: rolesIsModerator(user?.roles),
        devAuthEnabled: DEV_AUTH_ENABLED,
        devLogin,
      }}
    >
      {children}
    </CaseworkAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCaseworkAuth() {
  const ctx = useContext(CaseworkAuthContext);
  if (!ctx) throw new Error("useCaseworkAuth must be used inside CaseworkAuthProvider");
  return ctx;
}
