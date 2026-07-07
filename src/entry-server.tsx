import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './components/ThemeProvider';
import './i18n/config';
import { getCaseById, getCases, getStatistics } from './services/jds-api';
import { getArticleBySlug, getArticles } from './services/cms-api';
import { http } from './services/http';
import type { JawafEntity } from './types/jds';

// SSR/pre-render runs in Node, where the shared `http` client's same-origin
// default won't resolve — set VITE_JAWAFDEHI_API_BASE_URL (the monolith origin)
// for the SSR build so `http` carries an absolute baseURL. Every plane now lives
// on the ONE monolith under the unified `/api` root: entities at /api/entities,
// materials at /api/materials, court cases at /api/courtcases.

export interface RenderResult {
  html: string;
  helmetContext: { helmet?: HelmetServerState };
  dehydratedState: unknown;
}

async function prefetch(url: string, queryClient: QueryClient): Promise<void> {
  // Home page: prefetch stats + first page of cases
  if (url === '/') {
    await Promise.allSettled([
      queryClient.prefetchQuery({ queryKey: ['statistics'], queryFn: getStatistics }),
      queryClient.prefetchQuery({ queryKey: ['cases', { page: 1 }], queryFn: () => getCases({ page: 1 }) }),
    ]);
    return;
  }

  // Cases list page
  if (url === '/cases') {
    await queryClient.prefetchQuery({ queryKey: ['cases', { page: 1 }], queryFn: () => getCases({ page: 1 }) });
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

  // Entity profile page
  const entityMatch = url.match(/^\/entity\/(\d+)/);
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

export async function render(url: string): Promise<RenderResult> {
  const helmetContext: { helmet?: HelmetServerState } = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 0 } },
  });

  await prefetch(url, queryClient);

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
  return { html, helmetContext, dehydratedState };
}
