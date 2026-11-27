import * as ReactDOMServer from 'react-dom/server';
import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import App from './App';
import { registerEagerLegalBodies } from './pages/legal/bodies';
import { EAGER_LEGAL_BODIES } from './pages/legal/eager-bodies';
import { ThemeProvider } from './components/ThemeProvider';
import './i18n/config';
import { getCaseById, getStatistics } from './services/jds-api';
import { searchArchive } from './services/search-api';
import { crawlableListing } from './lib/crawlable-listing';
import { readParams, readRecordType } from './utils/archive-search-params';
import { getArticleBySlug, getArticles } from './services/cms-api';
import { featuredCasesQuery } from './queries/home';
import { blogPostsQuery } from './queries/blog';
import { courtCaseIri, courtCaseRelatedCasesQuery, entityRelatedCasesQuery } from './queries/related-cases';
import { getAllPages } from './services/datalake-api';
import { http } from './services/http';
import { documentSourcesQuery } from './lib/document-sources';
import { seriesQuery } from './queries/series';
import { reportPrefetch } from './lib/ssr-prefetch';
import type { PrefetchReport } from './lib/ssr-prefetch';

// Re-exported so `scripts/pre-render.ts` can install the build's bearer token on
// THIS bundle. The script imports the compiled `dist/server/entry-server.js`,
// which carries its own copy of the axios client — reaching for the TypeScript
// source instead would configure a different module instance and silently leave
// every outgoing request anonymous. See services/prerender-auth.ts.
export { setPrerenderToken } from './services/prerender-auth';

// The legal texts are lazy on the client but must render synchronously here,
// or /privacy and /terms would pre-render empty (src/pages/legal/bodies.ts).
registerEagerLegalBodies(EAGER_LEGAL_BODIES);

/**
 * Upper bound on every API request this bundle makes, in ms.
 *
 * The build leaves the client's timeouts alone (30 s default, 10 s for most
 * jds-api calls). The Worker (edge SSR, see worker/edge-render.ts) caps them at
 * a few seconds instead: a reader waiting on a cache miss is better served by
 * the meta-injection shell after 4 s than by a page after 10. A CAP rather than
 * a default because jds-api passes its own per-call `timeout`, which a default
 * would not override. Same reason as setPrerenderToken for living here: the
 * Worker holds the COMPILED bundle, which carries its own copy of the axios
 * client.
 */
let apiTimeoutCap: number | null = null;
let apiTimeoutInterceptor: number | null = null;

export function setApiTimeout(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return;
  apiTimeoutCap = ms;
  if (apiTimeoutInterceptor === null) {
    apiTimeoutInterceptor = http.interceptors.request.use((config) => {
      if (apiTimeoutCap !== null) {
        config.timeout = config.timeout ? Math.min(config.timeout, apiTimeoutCap) : apiTimeoutCap;
      }
      return config;
    });
  }
}

// Just the part of an NES entity record this module needs: the canonical IRI that
// keys the related-cases query. Deliberately not the full EntityRecord shape —
// nothing here renders the record, it only forwards its identity.
type EntityRecordHead = { '@id'?: string };

// SSR/pre-render runs in Node, where the shared `http` client's same-origin
// default won't resolve — set VITE_JAWAFDEHI_API_BASE_URL (the monolith origin)
// for the SSR build so `http` carries an absolute baseURL. Every plane now lives
// on the ONE monolith under the unified `/api` root: entities at /api/entities,
// materials at /api/materials, court cases at /api/courtcases.

export interface RenderResult {
  html: string;
  helmetContext: { helmet?: HelmetServerState };
  dehydratedState: unknown;
  prefetch: PrefetchReport;
}

/**
 * Data the caller already holds, seeded into the cache instead of re-fetched.
 *
 * Built for the entity pre-render, which batched records 25 at a time from
 * `/api/entities?ids=` instead of one call per page. That pre-render is gone
 * (entity pages are rendered at the edge, one per request), so no caller seeds
 * today; the hook is kept because it is cheap and tested.
 *
 * A seeded record must be byte-identical to what the per-page fetch would have
 * returned, or the pre-rendered HTML silently diverges from the live page. It
 * is: both endpoints return a bare `EntityRepository().get_entity(iri)` with no
 * extra serialization on either path.
 */
export interface RenderSeed {
  /** The `['entity-record', tail]` payload for an `/entity/<prefix>/<slug>` URL. */
  entityRecord?: unknown;
}

/** How render() is being driven. */
export interface RenderOptions {
  /**
   * Rendering one page on request at the edge, not the whole archive at build
   * time. Turns off the transient retries below: they exist so one blip does
   * not fail a 3,000-page build, but on a reader's request they turn a 4 s
   * timeout into 18 s of waiting. At the edge a failed fetch falls back to the
   * cached copy or the meta-injection shell instead.
   */
  edge?: boolean;
}

// Nothing here reports whether it worked: prefetchQuery swallows its own errors,
// so a route whose every fetch failed is indistinguishable from one that had
// nothing to fetch. render() reads the outcome off the cache instead, and
// scripts/pre-render.ts fails the build on it — which is how a prefetch that
// silently returned nothing for months (see getAccessToken in services/oidc.ts)
// stops being a thing that can ship.
/**
 * Prefetch a query the page can do without. On failure the entry is removed
 * rather than left in `error`: reportPrefetch would count it as failed, and the
 * edge (worker/edge-render.ts) serves the fallback shell for any failed
 * prefetch — so one slow related-cases call would cost the whole page its SSR.
 * Removed, the component just fetches it on the client as it did before.
 */
async function prefetchOptional(
  queryClient: QueryClient,
  query: { queryKey: readonly unknown[]; queryFn: () => Promise<unknown> },
): Promise<void> {
  await queryClient.prefetchQuery({ ...query, retry: false });
  if (queryClient.getQueryState(query.queryKey)?.status !== 'success') {
    queryClient.removeQueries({ queryKey: query.queryKey, exact: true });
  }
}

async function prefetch(
  url: string,
  queryClient: QueryClient,
  seed?: RenderSeed,
  options?: RenderOptions,
): Promise<void> {
  const transientRetry = options?.edge ? NO_RETRY : TRANSIENT_RETRY;
  // Home page: prefetch stats + the same featured-case search the client renders.
  // featuredCasesQuery() is the SHARED definition (queries/home.ts) — the key and
  // params must match pages/Index.tsx exactly or this prefetch fills a cache entry
  // the client never asks for, and the section flashes its skeleton anyway.
  if (url === '/') {
    await Promise.allSettled([
      queryClient.prefetchQuery({ queryKey: ['statistics'], queryFn: getStatistics }),
      queryClient.prefetchQuery(featuredCasesQuery()),
      queryClient.prefetchQuery(blogPostsQuery()),
    ]);
    return;
  }

  // Data Quality & Coverage page: shares the ['statistics'] query key with the
  // home hero, so prefetching here paints the KPI strip / sections server-side
  // instead of flashing empty until the client fetch resolves.
  if (/^\/data-quality\/?(?:[?#]|$)/.test(url)) {
    // Plus the source catalogue its "where the evidence comes from" summary reads.
    await Promise.allSettled([
      queryClient.prefetchQuery({ queryKey: ['statistics'], queryFn: getStatistics }),
      queryClient.prefetchQuery(documentSourcesQuery()),
    ]);
    return;
  }

  // Materials landing page (BARE /materials only — ?series= and ?source= are
  // client-rendered, ?q= redirects into /search on the client). The source
  // catalogue is the SHARED definition (lib/document-sources.ts), so the key
  // matches the page exactly and the pre-rendered HTML carries the real
  // archive total.
  if (/^\/materials\/?(?:#|$)/.test(url)) {
    await Promise.allSettled([
      queryClient.prefetchQuery(documentSourcesQuery()),
    ]);
    return;
  }

  // Updates/News list page, with or without the trailing slash (the canonical
  // form) or a ?filter=: an exact '/updates' missed '/updates/', which then
  // shipped skeletons and waited on the CMS in the browser.
  if (/^\/updates\/?(?:[?#]|$)/.test(url)) {
    await queryClient.prefetchQuery({ queryKey: ['cms-articles'], queryFn: () => getArticles() });
    return;
  }
  // The blog lists only BLOG articles, under its own key; Updates & News leaves them out.
  if (/^\/blog\/?(?:[?#]|$)/.test(url)) {
    await queryClient.prefetchQuery(blogPostsQuery());
    return;
  }

  // Article detail page: the slug after /updates/ or /blog/ up to /?#. Not a
  // product update (/updates/product/<id>): those are static data, and matching
  // them asked the CMS for an article called "product" on every render.
  const updateMatch = url.match(/^\/(?:updates\/(?!product\/)|blog\/)([^/?#]+)/);
  if (updateMatch) {
    const slug = decodeURIComponent(updateMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: ['cms-article', slug],
      queryFn: () => getArticleBySlug(slug),
    });
    return;
  }

  // Case detail page (slug-only API; slug is everything after /case/ up to /?#)
  //
  // Retried, unlike the embed branch below, because this one is pre-rendered 463
  // times in a single build. At that volume a 10s timeout stops being a
  // hypothetical: one case timed out on the first full build that rendered them
  // all. Retrying a timeout is cheap next to re-running a 3-minute deploy.
  // A crawlable search listing: the UNFILTERED listing of one record type, one
  // page at a time — the only /search URLs the edge renders
  // (lib/crawlable-listing.ts). Their results are the archive's crawl path, so
  // they must be in the HTML, not fetched after hydration. The params come from
  // the page's own readParams, so this fills exactly the cache entry
  // ArchiveSearch reads (["archive-search", params]); a key the page does not
  // read is a prefetch nobody consumes.
  //
  // The build never reaches this: it pre-renders bare /search, which is not a
  // listing, so the static page — and the build's time budget — are unchanged.
  {
    const parsed = new URL(url, 'https://jawafdehi.org');
    if (crawlableListing(parsed.pathname, parsed.search)) {
      const params = readParams(parsed.searchParams, readRecordType(parsed.searchParams));
      await queryClient.prefetchQuery({
        queryKey: ['archive-search', params],
        queryFn: () => searchArchive(params),
        ...transientRetry,
      });
      return;
    }
  }

  const caseMatch = url.match(/^\/case\/([^/?#]+)/);
  if (caseMatch) {
    const slug = decodeURIComponent(caseMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: ['case', slug],
      queryFn: () => getCaseById(slug),
      ...transientRetry,
    });
    return;
  }

  // Case series page (/series/<slug>/), rendered at the edge like a case. The
  // key is the page's own (seriesQuery: ['series', slug]) so SeriesDetail reads
  // what this wrote; the data is the same API response getSeries returns.
  //
  // The fetch differs in one way: getSeries turns a 404 into `null` (the page's
  // not-found state), which would leave a SUCCESSFUL query here and a page with
  // no title — an edge error. Thrown instead, the 404 reaches reportPrefetch
  // with its status, and the edge answers a real 404 (worker/edge-render.ts).
  const seriesMatch = url.match(/^\/series\/([^/?#]+)/);
  if (seriesMatch) {
    const slug = decodeURIComponent(seriesMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: seriesQuery(slug).queryKey,
      queryFn: async () => {
        try {
          const res = await http.get(`/api/series/${encodeURIComponent(slug)}/`, { timeout: 10000 });
          return res.data;
        } catch (error) {
          // The API's "no such series" is DRF's JSON 404. An API that predates
          // the endpoint answers Django's HTML 404 for every slug instead: that
          // is not an answer about this series, so it must not become a cached,
          // noindexed 404. Rethrown without a status, it is an edge error and
          // the Worker serves the client-rendered shell (never cached).
          const response = (error as { response?: { status?: number; headers?: Record<string, unknown> } })
            .response;
          const contentType = String(response?.headers?.['content-type'] ?? '');
          if (response?.status === 404 && !contentType.includes('json')) {
            throw new Error('series endpoint missing on the API (non-JSON 404); client render');
          }
          throw error;
        }
      },
      ...transientRetry,
    });
    return;
  }

  // Embed case card route
  const embedMatch = url.match(/^\/embed\/case\/([^/?#]+)/);
  if (embedMatch) {
    const slug = decodeURIComponent(embedMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: ['case', slug],
      queryFn: () => getCaseById(slug),
    });
    return;
  }

  // Entity record page, IRI-keyed (/entity/<prefix>/<slug>). The query key mirrors
  // EntityRecordProfile's useQuery (['entity-record', tail]) so the client hydrates
  // from the dehydrated cache instead of refetching.
  //
  // This branch is what makes pre-rendering these pages worth anything. Without
  // it the route still renders — it just renders with an empty cache, so the
  // crawler gets a skeleton whose <title> is the URL slug and whose body is
  // loading state, and the noindex in EntityRelatedCases never fires because it
  // is keyed on a LOADED, genuinely empty result. It is also why the build could
  // not catch that: reportPrefetch only reports on prefetches a branch actually
  // asked for, so a route with no branch here has nothing to fail.
  const entityRecordMatch = url.match(/^\/entity\/(.+?)\/?(?:[?#]|$)/);
  if (entityRecordMatch) {
    const tail = decodeURIComponent(entityRecordMatch[1]);

    // Seeded by the caller from a batch lookup — see RenderSeed. setQueryData
    // leaves the query in `success`, which is exactly what reportPrefetch reads,
    // so a seeded page is counted as fulfilled and the empty-cache guard in
    // pre-render.ts keeps covering these routes.
    //
    // Falling through when there is no seed is deliberate: a record the batch
    // could not resolve is fetched individually and, if that fails too, shows up
    // as a prefetch failure exactly as before. Slower, never wrong.
    if (seed?.entityRecord !== undefined) {
      queryClient.setQueryData(['entity-record', tail], seed.entityRecord);
      return;
    }

    // The related-cases column (EntityRelatedCases, keyed on the record's
    // `@id`) is fetched alongside the record. It is the only link from an
    // entity page to the cases that cite it, so leaving it out shipped every
    // entity page with an aria-busy skeleton and no href="/case/" at all —
    // crawlers could reach the 2,836 case pages from almost nowhere but the
    // sitemap. The build used to skip it because ~3,158 calls drew 429s; entity
    // pages are rendered one per request at the edge now (#488), so that cost
    // no longer exists.
    //
    // Fetched in parallel with the record, under the IRI the URL implies (an
    // `@id` IS https://jawafdehi.org/entity/<tail>). If the record's actual @id
    // turns out different, the speculative entry is dropped and the client
    // fetches under the right key. Optional either way: a failure leaves the
    // column to the client, it never fails the page.
    const impliedIri = `https://jawafdehi.org/entity/${tail}`;
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['entity-record', tail],
        queryFn: async () => {
          const res = await http.get<EntityRecordHead>(`/api/entities/${tail}`);
          return res.data;
        },
        ...transientRetry,
      }),
      prefetchOptional(queryClient, entityRelatedCasesQuery(impliedIri)),
    ]);
    const record = queryClient.getQueryData<EntityRecordHead>(['entity-record', tail]);
    if (record && record['@id'] !== impliedIri) {
      queryClient.removeQueries({ queryKey: ['entity-related-cases', impliedIri], exact: true });
    }
    return;
  }

  // Data-lake material profile (/material/<source>/<ident>). The query key mirrors
  // MaterialProfile's useQuery (['datalake-material', tail]) so the client hydrates
  // from the dehydrated cache instead of refetching.
  const materialMatch = url.match(/^\/material\/(.+?)(?:[?#]|$)/);
  if (materialMatch) {
    const tail = decodeURIComponent(materialMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: ['datalake-material', tail],
      queryFn: async () => {
        const res = await http.get(`/api/materials/${tail}`);
        return res.data;
      },
    });
    return;
  }

  // Data-lake court case profile (/courtcase/<court>/<case_number>). Assembles the
  // composite-key core + hearings + entities into one CourtCase, keyed to match
  // CourtCaseProfile's useQuery (['datalake-courtcase', court, caseNumber]).
  const courtcaseMatch = url.match(/^\/courtcase\/([^/]+)\/(.+?)\/?(?:[?#]|$)/);
  if (courtcaseMatch) {
    const court = decodeURIComponent(courtcaseMatch[1]);
    const caseNumber = decodeURIComponent(courtcaseMatch[2]);
    const base = `/api/courtcases/${encodeURIComponent(court)}/${encodeURIComponent(caseNumber)}`;
    // The cases citing this court case are its only links to case pages; see
    // the entity branch above. Optional: a failure leaves them to the client.
    const related = prefetchOptional(queryClient, courtCaseRelatedCasesQuery(courtCaseIri(court, caseNumber)));
    await queryClient.prefetchQuery({
      queryKey: ['datalake-courtcase', court, caseNumber],
      queryFn: async () => {
        // Core must load; hearings/entities degrade to [] (mirrors
        // getCourtCaseFull so SSR and client agree on cache shape).
        const core = await http.get(`${base}/`).then((r) => r.data);
        const [hearings, entities] = await Promise.all([
          getAllPages((u, c) => http.get(u, c), `${base}/hearings`).catch(() => []),
          getAllPages((u, c) => http.get(u, c), `${base}/entities`).catch(() => []),
        ]);
        return { ...core, hearings, entities };
      },
    });
    await related;
    return;
  }
}

// A prefetch that comes back failed fails the BUILD (pre-render.ts refuses to
// publish a skeleton), and entity pages took the pre-rendered route count from a
// handful to ~1,579. One transient upstream blip in any of them now costs a whole
// deploy — a real build lost three to 503s. These two queries retry so that the
// guard keeps meaning "the API is broken" rather than "the API hiccuped once".
//
// Applied per-query, NOT as a client default: the default stays retry: 0 because
// the other prefetches are a handful of one-off calls whose failure should be
// reported immediately, and tests/ssr/prefetch-report.test.tsx pins exactly that.
//
// Bounded hard: at most two extra attempts, ~1s then ~2s, on top of the per-call
// timeout in services/http. Only for failures that can plausibly succeed on a
// retry — a 404 on an entity IRI is a data problem more attempts cannot fix, and
// retrying it would just triple the time the build takes to say so.
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function retryTransient(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  const status = (error as { response?: { status?: number } })?.response?.status;
  // No response at all: a timeout, a socket hangup, DNS. Worth another go.
  if (status === undefined) return true;
  return RETRYABLE_STATUSES.has(status);
}

const TRANSIENT_RETRY = {
  retry: retryTransient,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 4000),
} as const;

const NO_RETRY = { retry: 0 } as const;

/**
 * Render to a string AFTER every Suspense boundary has resolved.
 *
 * `renderToString` cannot wait: a `lazy()` page renders as its fallback, which
 * is why the build only pre-renders eager routes (see the split policy in
 * src/routes.tsx). At the edge that would leave /material/* and /courtcase/* —
 * both lazy, deliberately, to keep them out of the initial client bundle — as a
 * skeleton. `renderToReadableStream` + `allReady` loads the lazy chunk on the
 * server and emits the real page, without touching the client bundle.
 *
 * Only reachable in the Worker: React 18's Node build of react-dom/server has no
 * renderToReadableStream, and the build never passes `edge`.
 */
async function renderComplete(tree: ReactElement): Promise<string> {
  const renderStream = (ReactDOMServer as { renderToReadableStream?: RenderToReadableStream })
    .renderToReadableStream;
  if (!renderStream) return renderToString(tree);
  let renderError: unknown = null;
  const stream = await renderStream(tree, {
    onError(error: unknown) {
      renderError = error;
    },
  });
  await stream.allReady;
  const html = await new Response(stream).text();
  if (renderError) throw renderError;
  return html;
}

type RenderToReadableStream = (
  children: ReactElement,
  options?: { onError?: (error: unknown) => void },
) => Promise<ReadableStream & { allReady: Promise<void> }>;

export async function render(
  url: string,
  seed?: RenderSeed,
  options?: RenderOptions,
): Promise<RenderResult> {
  const helmetContext: { helmet?: HelmetServerState } = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 0 } },
  });

  await prefetch(url, queryClient, seed, options);
  // Before the render, not after: see reportPrefetch.
  const prefetchReport = reportPrefetch(queryClient);

  const tree = (
    <ThemeProvider>
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
  const html = options?.edge ? await renderComplete(tree) : renderToString(tree);

  const dehydratedState = dehydrate(queryClient);
  return { html, helmetContext, dehydratedState, prefetch: prefetchReport };
}
