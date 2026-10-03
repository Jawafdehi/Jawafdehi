import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './components/ThemeProvider';
import './i18n/config';
import { getCaseById, getStatistics } from './services/jds-api';
import { getArticleBySlug, getArticles } from './services/cms-api';
import { searchArchive } from './services/search-api';
import { featuredCasesQuery } from './queries/home';
import {
  RECENT_MATERIALS_COUNT,
  archiveStatisticsQuery,
  recentMaterialsQuery,
} from './queries/materials-landing';
import { pickRecentMaterials } from './lib/materials-landing';
import { getMaterial, materialTail } from './services/datalake-api';
import type { ArchiveSearchResponse } from './types/search';
import { http } from './services/http';
import { reportPrefetch } from './lib/ssr-prefetch';
import type { PrefetchReport } from './lib/ssr-prefetch';
import type { JawafEntity } from './types/jds';

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
 * `scripts/pre-render.ts` renders one page per entity a published case cites —
 * ~2,500 of them. Fetching each record here cost one upstream call per page and
 * blew the API's 1000/hour anonymous throttle, which is what turned a green
 * build into a coin flip. The same records come back 25 at a time from
 * `/api/entities?ids=`, so the caller batches them and hands the record down.
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

// Nothing here reports whether it worked: prefetchQuery swallows its own errors,
// so a route whose every fetch failed is indistinguishable from one that had
// nothing to fetch. render() reads the outcome off the cache instead, and
// scripts/pre-render.ts fails the build on it — which is how a prefetch that
// silently returned nothing for months (see getAccessToken in services/oidc.ts)
// stops being a thing that can ship.
async function prefetch(
  url: string,
  queryClient: QueryClient,
  seed?: RenderSeed,
): Promise<void> {
  // Home page: prefetch stats + the same featured-case search the client renders.
  // featuredCasesQuery() is the SHARED definition (queries/home.ts) — the key and
  // params must match pages/Index.tsx exactly or this prefetch fills a cache entry
  // the client never asks for, and the section flashes its skeleton anyway.
  if (url === '/') {
    await Promise.allSettled([
      queryClient.prefetchQuery({ queryKey: ['statistics'], queryFn: getStatistics }),
      queryClient.prefetchQuery(featuredCasesQuery()),
    ]);
    return;
  }

  // Data Quality & Coverage page: shares the ['statistics'] query key with the
  // home hero, so prefetching here paints the KPI strip / sections server-side
  // instead of flashing empty until the client fetch resolves.
  if (/^\/data-quality\/?(?:[?#]|$)/.test(url)) {
    await queryClient.prefetchQuery({ queryKey: ['statistics'], queryFn: getStatistics });
    return;
  }

  // Materials landing page (BARE /materials only — ?series= and ?q= views are
  // client-rendered). The query factories are the SHARED definitions
  // (queries/materials-landing.ts), so keys and params match the page exactly
  // and the pre-rendered HTML carries the real archive figures. After the
  // recents resolve, the four shown documents are prefetched too — their own
  // records carry the descriptions the cards render (search snippets are
  // empty when browsing).
  if (/^\/materials\/?(?:#|$)/.test(url)) {
    const recentsQuery = recentMaterialsQuery();
    await Promise.allSettled([
      queryClient.prefetchQuery(archiveStatisticsQuery()),
      queryClient.prefetchQuery(recentsQuery),
    ]);
    const recents = queryClient.getQueryData<ArchiveSearchResponse>(recentsQuery.queryKey);
    if (recents) {
      const picks = pickRecentMaterials(recents.results, RECENT_MATERIALS_COUNT);
      await Promise.allSettled(
        picks.map(({ result }) => {
          const tail = materialTail(result.id);
          return queryClient.prefetchQuery({
            queryKey: ['datalake-material', tail],
            queryFn: () => getMaterial(tail),
          });
        }),
      );
    }
    return;
  }

  // Cases list page: OpenSearch-backed case browse, via Django /api/search proxy.
  if (url === '/cases') {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ['cases-search', { search: '', status: 'all' }],
      queryFn: () => searchArchive({ type: 'case', sort: 'newest', page_size: 12 }),
      initialPageParam: '',
    });
    return;
  }

  // Updates/News list page
  if (url === '/updates') {
    await queryClient.prefetchQuery({ queryKey: ['cms-articles'], queryFn: () => getArticles() });
    return;
  }

  // Article detail page (slug is everything after /updates/ up to /?#)
  const updateMatch = url.match(/^\/updates\/([^/?#]+)/);
  if (updateMatch) {
    const slug = decodeURIComponent(updateMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: ['cms-article', slug],
      queryFn: () => getArticleBySlug(slug),
    });
    return;
  }

  // Case detail page (slug-only API; slug is everything after /case/ up to /?#)
  const caseMatch = url.match(/^\/case\/([^/?#]+)/);
  if (caseMatch) {
    const slug = decodeURIComponent(caseMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: ['case', slug],
      queryFn: () => getCaseById(slug),
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

  // Entity profile page — LEGACY numeric route (/entity/<id>). Must stay ahead of
  // the IRI branch below, which would otherwise swallow it.
  // Anchored to a SINGLE all-digit segment, which is what the legacy route is —
  // an IRI is always prefix/slug, so it never has one. Unanchored, this read
  // /entity/2070-b-s/foo as legacy entity 2070 and prefetched the wrong record
  // under the wrong key: NES prefixes may legally start with digits
  // (jawafdehi_shared/entities/ids.py allows [a-z0-9_]+).
  const entityMatch = url.match(/^\/entity\/(\d+)(?:[?#]|$)/);
  if (entityMatch) {
    const entityId = parseInt(entityMatch[1]);
    await queryClient.prefetchQuery({
      queryKey: ['jds-entity', entityId],
      queryFn: async () => {
        const res = await http.get<JawafEntity>(`/api/entities/${entityId}/`);
        return res.data;
      },
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

    await queryClient.prefetchQuery({
      queryKey: ['entity-record', tail],
      queryFn: async () => {
        const res = await http.get<EntityRecordHead>(`/api/entities/${tail}`);
        return res.data;
      },
      ...TRANSIENT_RETRY,
    });

    // NOT prefetched here: EntityRelatedCases' own query, keyed on the record's
    // `@id`. So the related-cases column of a pre-rendered entity page is still
    // its aria-busy skeleton — measured over a full build, 1,579 entity pages
    // contained the skeleton and none contained a single href="/case/". The
    // identity, title, description and facts are real; the case list is not.
    //
    // Fetching it per entity was tried and does not work: it doubles the build to
    // ~3,158 upstream calls and api.jawafdehi.org answers 429. The fix is to
    // SEED it rather than fetch it — pre-render.ts already holds every published
    // case with its binds, so the citing set for an IRI is derivable in-process
    // for zero extra calls, and the component sorts client-side so server order
    // does not matter. That needs the list payload confirmed field-identical to
    // /api/cases/?entity=, and a seed threaded through render(); deliberately
    // left out of this PR rather than done hastily inside it.
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
    await queryClient.prefetchQuery({
      queryKey: ['datalake-courtcase', court, caseNumber],
      queryFn: async () => {
        // Core must load; hearings/entities degrade to [] (mirrors
        // getCourtCaseFull so SSR and client agree on cache shape).
        const core = await http.get(`${base}/`).then((r) => r.data);
        const [hearings, entities] = await Promise.all([
          http.get(`${base}/hearings`).then((r) => r.data?.results ?? r.data ?? []).catch(() => []),
          http.get(`${base}/entities`).then((r) => r.data?.results ?? r.data ?? []).catch(() => []),
        ]);
        return { ...core, hearings, entities };
      },
    });
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

export async function render(url: string, seed?: RenderSeed): Promise<RenderResult> {
  const helmetContext: { helmet?: HelmetServerState } = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 0 } },
  });

  await prefetch(url, queryClient, seed);
  // Before the render, not after: see reportPrefetch.
  const prefetchReport = reportPrefetch(queryClient);

  const html = renderToString(
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

  const dehydratedState = dehydrate(queryClient);
  return { html, helmetContext, dehydratedState, prefetch: prefetchReport };
}
