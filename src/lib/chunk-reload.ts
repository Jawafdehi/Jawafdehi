// Surviving a deploy that happens while someone is reading.
//
// Cloudflare Workers Builds swaps every hashed asset atomically, so a tab still
// running the previous build 404s the moment it lazy-loads a chunk whose hash no
// longer exists. Reloading is the right answer. Getting there without flashing an
// error at the reader is the fiddly part, and the previous guard got it wrong in
// a way that produced the very errors it was added to prevent.
//
// What Vite actually does (v5.4.21, `dist/node/chunks/dep-BK3b2jBa.js:64849`):
//
//     function handlePreloadError(err) {
//       const e = new Event("vite:preloadError", { cancelable: true });
//       e.payload = err;
//       window.dispatchEvent(e);          // listeners run SYNCHRONOUSLY
//       if (!e.defaultPrevented) { throw err; }
//     }
//     return promise.then((res) => { ...; return baseModule().catch(handlePreloadError); });
//
// So `preventDefault()` means "do not rethrow" — and with nothing thrown,
// `handlePreloadError` returns `undefined`, `.catch()` RESOLVES, and the dynamic
// import hands the caller `undefined` instead of a module. `window.location.reload()`
// only queues a navigation; the current task keeps running. So every call site
// then did `m.CaseEntityCards` on `undefined`, threw a TypeError into the nearest
// ErrorBoundary, blanked the section and reported to Sentry — all before the
// reload landed. 21 of the 37 events in the 30 days to 2026-09-29 were that, under
// four different titles; another 11 were the cooldown branch below.
//
// The shape that works: tell the call sites a reload is in flight, and have them
// return a promise that does not settle, so Suspense simply keeps showing the
// fallback until the page goes away.
//
// SCOPE, so nobody re-measures this and concludes it did nothing: #415 moved the
// two loudest call sites (the case page's party cards and court-case details) off
// `lazy()` + `<Suspense>` and onto `lazyChart`, for unrelated SSR reasons. That
// incidentally immunised them — `lazyChart` loads in an effect and `.catch()`es,
// so a dead chunk just leaves the placeholder up. 31 of those 37 events came from
// those two. What is left is the eight call sites that are still genuinely
// `React.lazy` + `<Suspense>`, where a rejected import still reaches an
// ErrorBoundary: the home hero, the donate globe, the search बिगो filter, the
// materials series browse, the admin document preview and QR code, and one
// research chart. Low event counts, same defect, and the hero and search filter
// are on the two busiest routes in the app.

const RELOAD_KEY = "jds:chunk-reload-at";

// Long enough that a tab which reloads and immediately fails again is treated as
// genuinely broken rather than reloaded in a loop. Survives the reload because it
// lives in sessionStorage.
const RELOAD_COOLDOWN_MS = 10_000;

// How long to hold the Suspense fallback before admitting the reload is not
// coming. Normally the page is gone in well under a second and this never fires.
// It exists for the one case that can cancel a reload: `useUnsavedChanges` puts a
// `beforeunload` handler on the admin case form while it is dirty, and the admin
// form reaches lazy chunks (StreamField -> DocumentPreviewDialog). If the reader
// clicks "Stay on page", an unbounded wait would hang that section forever, so
// fail honestly instead — a real error beats a skeleton that never resolves.
const RELOAD_GRACE_MS = 10_000;

let reloadScheduled = false;

/** True once a stale-chunk reload has been queued for this page load. */
export function isReloadScheduled(): boolean {
  return reloadScheduled;
}

/** Test seam — the flag is module state and would otherwise leak between cases. */
export function resetChunkReloadState(): void {
  reloadScheduled = false;
}

export class ChunkReloadStalled extends Error {
  constructor() {
    super("Chunk reload was scheduled but the page never navigated");
    this.name = "ChunkReloadStalled";
  }
}

/**
 * Install the `vite:preloadError` handler. Client-only; call before hydration.
 */
export function installChunkReloadGuard(): void {
  window.addEventListener("vite:preloadError", (event) => {
    // A reload is already queued for this page load. Any FURTHER chunk that
    // fails in the same load must also be swallowed: without this, a page that
    // lazy-loads two chunks (a case page loads both the party cards and the
    // court-case details) reloads for the first and throws a raw "Failed to
    // fetch dynamically imported module" for the second, because the cooldown
    // below sees the timestamp the first one just wrote. That second error is
    // user-visible and entirely pointless — the reload is already coming.
    if (reloadScheduled) {
      event.preventDefault();
      return;
    }

    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
      // We reloaded moments ago and chunks are STILL failing, so this is not a
      // stale build — it is offline, a real 5xx, or a half-rolled-out deploy.
      // Leave `defaultPrevented` false so Vite rethrows and the error surfaces.
      return;
    }

    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    reloadScheduled = true;
    event.preventDefault();
    window.location.reload();
  });
}

/**
 * A `React.lazy` loader that degrades to a reload instead of an error boundary.
 *
 * Use in place of a bare `() => import(...)` or `.then((m) => ({ default: m.X }))`
 * — those destructure whatever the import resolved to, which is `undefined` on
 * the reload path and throws.
 *
 *     const Cards = lazy(lazyChunk(() => import("./cards"), (m) => m.CaseEntityCards));
 *     const Page  = lazy(lazyChunk(() => import("./Page"), (m) => m.default));
 */
export function lazyChunk<M, C>(
  load: () => Promise<M>,
  pick: (module: M) => C,
): () => Promise<{ default: C }> {
  return () =>
    load().then((module) => {
      if (module != null) return { default: pick(module) };

      // Only Vite's swallowed `.catch(handlePreloadError)` can get us here: a
      // successful `import()` always resolves to a module namespace object, never
      // null or undefined.
      if (isReloadScheduled()) {
        // Hold the Suspense fallback until the queued navigation lands. Rejecting
        // here is what used to blank the section a beat before the reload.
        return new Promise<{ default: C }>((_resolve, reject) => {
          setTimeout(() => reject(new ChunkReloadStalled()), RELOAD_GRACE_MS);
        });
      }

      // No reload pending, so nobody is going to rescue this. Throw something
      // that names the real problem rather than letting `pick` report
      // "Cannot read properties of undefined (reading 'CaseEntityCards')" — a
      // title that describes the symptom, hides the cause, and fragments into a
      // fresh Sentry issue per chunk hash.
      throw new Error("Dynamic import resolved without a module");
    });
}
