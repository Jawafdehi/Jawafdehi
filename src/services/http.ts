// Unified HTTP client for the Jawafdehi API.
//
// The backend is ONE consolidated monolith under a single `/api` surface — there
// is no per-domain host or prefix anymore. This module is the single axios
// client every service layer shares, so auth, base-URL resolution, and error
// extraction are defined exactly once (fragmented per-domain clients previously
// drifted — e.g. one defaulted to a prod host with no dev-auth support, which
// made local pages render empty).
//
// Base URL: prefer VITE_JAWAFDEHI_API_BASE_URL (the monolith ORIGIN, e.g.
// http://127.0.0.1:48010); otherwise same-origin (works behind one domain in
// prod, and via the Vite dev proxy locally). Never default to a remote host.
// Service modules pass FULL paths (`/api/...`) so every call site is
// self-documenting and there's no per-domain prefix to remember.
//
// Auth: OIDC bearer token when present; otherwise, when VITE_DEV_AUTH is on, the
// username/password Django session (cookie + X-CSRFToken). Production is
// SSO/OIDC-only — the dev-auth branch is inert without the flag.
import axios, { type AxiosInstance } from "axios";
import { getAccessToken } from "./oidc";
import { DEV_AUTH_ENABLED, DEV_AUTH_CSRF_KEY } from "./dev-auth-constants";

// Resolve the monolith origin. An explicit override wins; else same-origin.
export const API_BASE_URL: string = (() => {
  const override = import.meta.env.VITE_JAWAFDEHI_API_BASE_URL;
  if (override) return String(override).replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
})();

const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

// Default request timeout (ms). Bounds every call — most importantly the SSR
// prefetches in entry-server.tsx, where a stalled backend would otherwise block
// server rendering indefinitely. Per-call `timeout` overrides still win.
const DEFAULT_TIMEOUT_MS = 30_000;

/** The shared axios instance. Import this (or the `http` alias) everywhere. */
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

http.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (DEV_AUTH_ENABLED && typeof window !== "undefined") {
    // DEV_AUTH session: no bearer — ride the session cookie + CSRF on writes.
    config.withCredentials = true;
    const method = (config.method || "get").toLowerCase();
    const csrf = window.localStorage.getItem(DEV_AUTH_CSRF_KEY);
    if (csrf && UNSAFE_METHODS.has(method)) {
      config.headers["X-CSRFToken"] = csrf;
    }
  }
  return config;
});

/**
 * Best-effort human message from an axios/error value. Handles a plain-string
 * body, DRF `{ detail }`, the monolith's `{ error: { message } }`, and
 * field-error objects (`{ field: ["msg", ...] }`). This is the ONE error
 * extractor — service layers re-export it, they don't re-implement it.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const errObj = d.error as { message?: string } | undefined;
    if (errObj && typeof errObj.message === "string") return errObj.message;
    for (const v of Object.values(d)) {
      if (typeof v === "string" && v.trim()) return v;
      if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    }
  }
  return fallback;
}
