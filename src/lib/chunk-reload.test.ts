import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  ChunkReloadStalled,
  installChunkReloadGuard,
  isReloadScheduled,
  lazyChunk,
  resetChunkReloadState,
} from "./chunk-reload";

// Vite's own helper, reproduced from dist/node/chunks/dep-BK3b2jBa.js:64849. The
// bug these tests pin lives in the interaction between it and our listener, so a
// hand-waved fake would pin nothing — in particular it must RETURN UNDEFINED after
// preventDefault rather than rethrowing, which is the whole mechanism.
function handlePreloadError(err: Error) {
  const e = new Event("vite:preloadError", { cancelable: true }) as Event & { payload?: Error };
  e.payload = err;
  window.dispatchEvent(e);
  if (!e.defaultPrevented) throw err;
}

/** `import()` of a chunk that 404s, routed through Vite's helper like a real build. */
const deadImport = () =>
  Promise.reject(new TypeError("Failed to fetch dynamically imported module")).catch(
    handlePreloadError,
  ) as Promise<undefined>;

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetChunkReloadState();
  sessionStorage.clear();
  reload = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
  installChunkReloadGuard();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("installChunkReloadGuard", () => {
  it("reloads once on a stale chunk, and swallows the error", () => {
    expect(() => handlePreloadError(new TypeError("boom"))).not.toThrow();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(isReloadScheduled()).toBe(true);
  });

  it("swallows every FURTHER failure in the same page load without reloading again", () => {
    // A case page defers two chunks. Before this, the second failure fell through
    // to the cooldown branch — which the first had just armed — so it rethrew and
    // put a raw "Failed to fetch dynamically imported module" in front of a reader
    // who already had a reload coming.
    handlePreloadError(new TypeError("first"));
    expect(() => handlePreloadError(new TypeError("second"))).not.toThrow();
    expect(() => handlePreloadError(new TypeError("third"))).not.toThrow();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("rethrows when a reload already happened moments ago, rather than looping", () => {
    // sessionStorage survives the reload, so this is a FRESH page load that is
    // still failing. Not a stale build — offline, a real 5xx, or a half-rolled-out
    // deploy. Surface it.
    sessionStorage.setItem("jds:chunk-reload-at", String(Date.now()));
    resetChunkReloadState();

    expect(() => handlePreloadError(new TypeError("still broken"))).toThrow(
      "still broken",
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads again once the cooldown has passed", () => {
    sessionStorage.setItem("jds:chunk-reload-at", String(Date.now() - 11_000));
    resetChunkReloadState();

    expect(() => handlePreloadError(new TypeError("new deploy"))).not.toThrow();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("lazyChunk", () => {
  it("picks a named export from a healthy module", async () => {
    const load = lazyChunk(
      () => Promise.resolve({ Thing: "component" as const }),
      (m) => m.Thing,
    );
    await expect(load()).resolves.toEqual({ default: "component" });
  });

  it("picks a default export too", async () => {
    const load = lazyChunk(
      () => Promise.resolve({ default: "page" as const }),
      (m) => m.default,
    );
    await expect(load()).resolves.toEqual({ default: "page" });
  });

  it("does not settle while a reload is in flight", async () => {
    // THE REGRESSION. Vite resolves the import with `undefined` once our listener
    // calls preventDefault, so the old `.then((m) => ({ default: m.X }))` threw
    // "Cannot read properties of undefined" into the ErrorBoundary a beat before
    // the reload landed — blanking the section and reporting to Sentry. Staying
    // pending keeps the Suspense fallback up until the page goes away.
    const load = lazyChunk(deadImport, (m: undefined) => m as never);
    const pending = load();

    const settled = await Promise.race([
      pending.then(() => "resolved").catch(() => "rejected"),
      new Promise((r) => setTimeout(() => r("still pending"), 50)),
    ]);
    expect(settled).toBe("still pending");
    // Asserted after the race, not before it: `handlePreloadError` runs inside the
    // import's own `.catch`, so the flag is set a microtask after `load()` returns.
    expect(isReloadScheduled()).toBe(true);
  });

  it("gives up after the grace period, so a cancelled reload cannot hang forever", async () => {
    // `useUnsavedChanges` puts a `beforeunload` on the admin case form while it is
    // dirty, and that form reaches lazy chunks. If the reader clicks "Stay on
    // page" the queued reload never happens, and an unbounded wait would leave the
    // section on its skeleton for good. A named error beats a permanent spinner.
    vi.useFakeTimers();
    const load = lazyChunk(deadImport, (m: undefined) => m as never);
    const pending = load();
    const assertion = expect(pending).rejects.toBeInstanceOf(ChunkReloadStalled);

    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it("throws a named error when the module is empty and no reload is coming", async () => {
    // Inside the cooldown nothing calls preventDefault, so this path is reachable
    // only if Vite's contract changes. Name the real problem rather than letting
    // `pick` report "Cannot read properties of undefined (reading 'X')", which
    // describes the symptom and mints a new Sentry issue per chunk hash.
    resetChunkReloadState();
    const load = lazyChunk(
      () => Promise.resolve(undefined as unknown as { X: string }),
      (m) => m.X,
    );
    await expect(load()).rejects.toThrow("Dynamic import resolved without a module");
  });
});
