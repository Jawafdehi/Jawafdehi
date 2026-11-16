import * as Sentry from "@sentry/react";
import { isCloudflarePreviewHost, telemetryAllowedHere } from "./telemetry";

const HARDCODED_DSN = "https://f5fafd04ccca67355a3b404d1b209e94@o4511364048027648.ingest.de.sentry.io/4511366946226256";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry(): void {
  // Cloudflare `*.workers.dev` previews NEVER report — even though CI bakes
  // VITE_SENTRY_DSN into every build — so preview errors can't reach the prod
  // Sentry project (which also tripped 429s). This block cannot be overridden.
  if (isCloudflarePreviewHost()) return;

  // Dev builds and localhost stay silent too, UNLESS a developer opts into local
  // Sentry testing by setting an explicit VITE_SENTRY_DSN.
  if (!SENTRY_DSN && !telemetryAllowedHere()) return;

  const dsn = SENTRY_DSN || HARDCODED_DSN;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Do not attach IP address, cookies, or other PII to events.
    sendDefaultPii: false,
    // Cloudflare injects its RUM beacon (`beacon.min.js`) and Web Analytics at the
    // edge; that third-party code calls `Array.prototype.at()` and throws in older
    // browsers that lack it (e.g. `t.entries.at is not a function`). It is not our
    // bundle and is unactionable noise, so refuse events whose frames originate
    // from those scripts.
    denyUrls: [/beacon\.min\.js/i, /static\.cloudflareinsights\.com/i],
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    // Error-only replay: never record random sessions, only when an error fires.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });

  // Replay joins once the page is idle, from its own chunk, so its weight is not
  // in the first-paint bundle. Errors are captured from the start either way;
  // only a replay of the first second or two before an early error is lost.
  // Mask text and block media in any captured replay.
  const addReplay = () =>
    import("./sentry-replay")
      .then(({ replayIntegration }) =>
        Sentry.addIntegration(replayIntegration({ maskAllText: true, blockAllMedia: true })),
      )
      .catch(() => {
        // A failed chunk load costs only the replay; error reporting is unaffected.
      });
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(addReplay);
  else window.setTimeout(addReplay, 2000);
}
