import * as Sentry from "@sentry/react";

const HARDCODED_DSN = "https://f5fafd04ccca67355a3b404d1b209e94@o4511364048027648.ingest.de.sentry.io/4511366946226256";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry(): void {
  // Never send events to production Sentry from a local dev build — otherwise
  // localhost errors pollute the prod project and get rate-limited (429).
  if (import.meta.env.DEV) return;

  const dsn = SENTRY_DSN || HARDCODED_DSN;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Do not attach IP address, cookies, or other PII to events.
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Mask text and block media in any captured replay.
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    // Error-only replay: never record random sessions, only when an error fires.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}
