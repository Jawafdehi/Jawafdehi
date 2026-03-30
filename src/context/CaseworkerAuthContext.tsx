import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { CaseworkerUser } from "@/types/caseworker";
import { getMe, login as apiLogin, logout as apiLogout, isLoggedIn } from "@/services/caseworker-api";

interface AuthState {
  user: CaseworkerUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const CaseworkerAuthContext = createContext<AuthContextValue | null>(null);

export function CaseworkerAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const fetchUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    try {
      const user = await getMe();
      setState({ user, loading: false, error: null });
    } catch {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (username: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await apiLogin(username, password);
      await fetchUser();
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? "Login failed. Check your credentials.";
      setState((s) => ({ ...s, loading: false, error: msg }));
      throw new Error(msg);
    }
  };

  const logout = () => {
    apiLogout();
    setState({ user: null, loading: false, error: null });
  };

  return (
    <CaseworkerAuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAdmin: state.user?.role === "administrator",
      }}
    >
      {children}
    </CaseworkerAuthContext.Provider>
  );
}

export function useCaseworkerAuth() {
  const ctx = useContext(CaseworkerAuthContext);
  if (!ctx) throw new Error("useCaseworkerAuth must be used inside CaseworkerAuthProvider");
  return ctx;
}
