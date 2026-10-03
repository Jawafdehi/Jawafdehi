// SPDX-License-Identifier: Hippocratic-3.0
// Synthetic-traffic marking for the drivers that measure a REAL origin.
//
// Everything in this directory points at production by default, and the nightly
// workflow runs it against https://jawafdehi.org every night at 02:15 UTC. These
// are real browsers executing real JavaScript, so to every analytics tool we own
// they look exactly like visitors — and at ~7,300 requests in that one hour they
// are not a rounding error. Through September 2026 they roughly quadrupled the
// apparent pageload count while real arrivals were falling by three quarters,
// which is precisely backwards from what the numbers were being read to say.
//
// So: a driver that measures production must never be COUNTED by production.
// Two obligations, and they are not the same thing:
//
//   1. Not counted. Cloudflare Web Analytics injects its beacon at the edge, so
//      there is no consent flag or app-level gate that can refuse it — the only
//      place left to stop it is in the browser, here. This is the load-bearing
//      half.
//   2. Still identifiable. Suppression is invisible by nature, and the edge logs
//      keep every request whether a beacon fired or not. Carrying a marker in
//      the user agent is what lets someone reading those logs six months from
//      now tell our own robot from a visitor in Texas, instead of reconstructing
//      it from a burst at 02:00 UTC the way it had to be reconstructed once.
//
// ⚠️ Registering a route handler turns on network interception for the whole
// context, which costs a little latency on EVERY request, including in
// `perf-audit.mjs`. That is accepted deliberately: the beacon is itself a script
// download plus a POST, so a run without it is the more faithful measurement of
// our own page weight, not the less. What matters is that every driver does the
// same thing — do not "optimise" the blocking out of the perf driver alone, or
// its numbers stop being comparable with the rest.

/**
 * Appended to the emulated device user agent. Deliberately verbose and
 * self-describing: the audience for this string is a human reading an access
 * log who has no idea what it is.
 */
export const SYNTHETIC_UA_MARKER = "JawafdehiSyntheticQA/1.0 (+nightly-tier-b)";

/**
 * Telemetry sinks a synthetic run must never reach.
 *
 * `cdn-cgi/rum` is where Cloudflare's beacon POSTs its measurement and
 * `static.cloudflareinsights.com` is where the beacon script itself is fetched
 * from; blocking only the second still leaves a cached script able to report, so
 * both are listed. `/api/search/click` is our own search-relevance beacon, which
 * is deliberately NOT consent-gated (see `src/utils/searchClick.ts`) and so is
 * the one piece of app telemetry that a denied-consent storage state does not
 * already stop.
 */
const TELEMETRY_PATTERNS = [
  "**/static.cloudflareinsights.com/**",
  "**/cdn-cgi/rum**",
  "**/api/search/click**",
];

const defaultUaCache = new WeakMap();

/**
 * The user agent this browser would send if we set none.
 *
 * Needed because `engine-compare.mjs` runs WebKit and Firefox without an
 * explicit `userAgent`, and those send an ordinary desktop string with nothing
 * automated-looking in it — unlike headless Chromium, which at least says
 * "HeadlessChrome". Costs one throwaway context per browser, cached.
 */
async function defaultUserAgent(browser) {
  const cached = defaultUaCache.get(browser);
  if (cached) return cached;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const ua = await page.evaluate(() => navigator.userAgent);
  await ctx.close();
  defaultUaCache.set(browser, ua);
  return ua;
}

/** Append the marker to `userAgent`, without double-marking. */
export function markSynthetic(userAgent) {
  if (!userAgent) return userAgent;
  if (userAgent.includes(SYNTHETIC_UA_MARKER)) return userAgent;
  return `${userAgent} ${SYNTHETIC_UA_MARKER}`;
}

/** Drop every telemetry request made by `context`. Safe to call twice. */
export async function blockTelemetry(context) {
  for (const pattern of TELEMETRY_PATTERNS) {
    await context.route(pattern, (route) => route.abort());
  }
}

/**
 * `browser.newContext`, for a driver pointed at a real origin.
 *
 * Identical to the real thing except that the user agent carries the marker,
 * telemetry is blocked, and analytics consent is pre-denied for `base` when the
 * caller has not supplied a storage state of its own. Pass `base` (the origin
 * under test) so the consent key lands on the right origin; omit it only if you
 * are supplying `storageState` yourself.
 */
export async function newSyntheticContext(browser, { base, ...options } = {}) {
  const userAgent = markSynthetic(
    options.userAgent ?? (await defaultUserAgent(browser)),
  );

  // DENY analytics up front (key/value from src/lib/consent.ts) so the cookie
  // banner never masks the fold and GA is never loaded. This is belt to the
  // blocking braces above: consent stops gtag.js, blocking stops the rest.
  const storageState =
    options.storageState ??
    (base
      ? {
          cookies: [],
          origins: [
            {
              origin: base,
              localStorage: [
                { name: "jawafdehi_analytics_consent", value: "denied" },
              ],
            },
          ],
        }
      : undefined);

  const context = await browser.newContext({
    ...options,
    userAgent,
    ...(storageState ? { storageState } : {}),
  });
  await blockTelemetry(context);
  return context;
}
