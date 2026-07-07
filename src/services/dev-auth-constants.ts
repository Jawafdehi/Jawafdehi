// Shared DEV_AUTH constants. Both the unified HTTP client (http.ts, which
// attaches X-CSRFToken on writes) and the dev-auth service (dev-auth.ts, which
// stores the token) must agree on the exact localStorage keys and the flag, or
// CSRF headers silently break with no compiler signal. Defined once here.

export const DEV_AUTH_ENABLED = import.meta.env.VITE_DEV_AUTH === "true";

// localStorage keys for the dev-auth session snapshot.
export const DEV_AUTH_USER_KEY = "jawafdehi.devAuth.user";
export const DEV_AUTH_CSRF_KEY = "jawafdehi.devAuth.csrf";
