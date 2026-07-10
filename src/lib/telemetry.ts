/**
 * Telemetry host gate.
 *
 * Sentry error monitoring and Google Analytics must never run on developer
 * machines or Cloudflare preview deploys, so that local noise and test-
 * playground traffic don't pollute the production Sentry project / GA property.
 *
 * Two independent signals are needed because neither alone is sufficient:
 *   - `import.meta.env.DEV` catches `vite dev` regardless of the host it is
 *     served on (e.g. a LAN IP), but it is baked in at build time.
 *   - the runtime hostname catches Cloudflare `*.workers.dev` previews, which
 *     are PRODUCTION builds (`import.meta.env.DEV === false`) served from a
 *     throwaway host — build mode can't tell them apart from the real site.
 */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

/**
 * Cloudflare Workers preview deploy (`<name>.<subdomain>.workers.dev`, and
 * versioned previews `<version>-<name>.<subdomain>.workers.dev`) — a throwaway
 * test playground.
 *
 * This is an ABSOLUTE block that callers must honour even when they would
 * otherwise allow an explicit-DSN opt-in: CI bakes `VITE_SENTRY_DSN` into
 * builds, so a preview build always carries a DSN and could re-enable Sentry
 * here if suppression keyed off the DSN's presence.
 */
export function isCloudflarePreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "workers.dev" || host.endsWith(".workers.dev");
}

export function telemetryAllowedHere(): boolean {
  // No window (SSR / worker render): never load client telemetry.
  if (typeof window === "undefined") return false;

  // Dev builds never report, whatever host they are served from.
  if (import.meta.env.DEV) return false;

  const host = window.location.hostname;
  if (BLOCKED_HOSTS.has(host)) return false;

  if (isCloudflarePreviewHost()) return false;

  return true;
}
