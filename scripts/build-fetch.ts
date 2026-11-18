// One GET to the API from a build script, with a timeout and retries.
//
// The pre-render and the sitemap each walk the whole case list (~140 pages)
// plus the entity batches, and a deploy used to die on the first slow answer:
// production build 38a68552 (2026-11-16) rendered all 2,836 case pages, then
// failed in sitemap.ts because ONE request, /api/cases/?page=2, took longer
// than 10 s. CI's preview build failed the same way on
// /api/cases/?page_size=200. The API was slow (1.7–4.2 s per list page), not
// down, and a second try would have gone through.
//
// So a request that times out, fails at the network level, or answers 429/5xx
// is retried with backoff. Anything else (a 4xx, or a 2xx) is returned on the
// first try: retrying a 404 or a 400 cannot change the answer.

/** Per-attempt timeout. The case-list pages are the slowest calls a build makes. */
export const BUILD_FETCH_TIMEOUT_MS = 30_000;
/** Total tries per request, including the first. */
export const BUILD_FETCH_ATTEMPTS = 3;
/** Wait before the 2nd try; it doubles for each try after that. */
export const BUILD_FETCH_BACKOFF_MS = 2_000;

export interface BuildFetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  attempts?: number;
  backoffMs?: number;
  /** Injected by tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected by tests to skip real waiting. */
  sleep?: (ms: number) => Promise<void>;
  /** Where retry notices go; defaults to console.warn. */
  log?: (message: string) => void;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(url: string, options: BuildFetchOptions = {}): Promise<Response> {
  const {
    headers,
    timeoutMs = BUILD_FETCH_TIMEOUT_MS,
    attempts = BUILD_FETCH_ATTEMPTS,
    backoffMs = BUILD_FETCH_BACKOFF_MS,
    fetchImpl = fetch,
    sleep = defaultSleep,
    log = (message: string) => console.warn(message),
  } = options;

  let lastError: Error = new Error(`No attempt made fetching ${url}`);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: controller.signal, headers });
      if (!isRetryableStatus(res.status) || attempt === attempts) return res;
      lastError = new Error(`API error ${res.status} fetching ${url}`);
      // Release the discarded answer's connection before the next try: Node's
      // fetch does not reliably free an unread body, and a run of 5xx answers
      // during the case-list walk would otherwise hold connections open.
      await res.body?.cancel().catch(() => {});
    } catch (err) {
      lastError =
        err instanceof Error && err.name === 'AbortError'
          ? new Error(`Request timed out after ${timeoutMs}ms fetching ${url}`)
          : err instanceof Error
            ? err
            : new Error(String(err));
      if (attempt === attempts) break;
    } finally {
      clearTimeout(timer);
    }
    const wait = backoffMs * 2 ** (attempt - 1);
    log(`[build-fetch] ${lastError.message} (try ${attempt} of ${attempts}); retrying in ${wait}ms`);
    await sleep(wait);
  }
  throw new Error(`${lastError.message} (gave up after ${attempts} tries)`);
}
