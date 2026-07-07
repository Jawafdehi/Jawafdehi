/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Origin of the consolidated Jawafdehi API (serves /api/*). Same-origin when unset.
  readonly VITE_JAWAFDEHI_API_BASE_URL?: string;
  // OIDC auth provider config for the portal SPA.
  readonly VITE_OIDC_AUTHORITY?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
  readonly VITE_OIDC_AUDIENCE?: string;
  // DEV-ONLY: enables the username/password login form ("true"/"false").
  readonly VITE_DEV_AUTH?: string;
  readonly VITE_ENABLE_CASE_SUBMISSION_FORM?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ViewTransition {
  readonly finished: Promise<void>;
  readonly ready: Promise<void>;
  readonly updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

interface Document {
  startViewTransition?(callback?: () => Promise<void> | void): ViewTransition;
}
