import './lib/sentry';
import ErrorBoundary from './components/ErrorBoundary';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { hydrate } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './components/ThemeProvider';
import { initSentry } from './lib/sentry';
import './index.css';
import './i18n/config';

initSentry();

// A Cloudflare Workers Builds deploy swaps every hashed asset atomically, so a
// tab still running a previous build 404s when it lazy-loads a route chunk whose
// hash no longer exists — the edge serves index.html in its place, which trips
// "Failed to fetch dynamically imported module" and drops the user on the error
// boundary (e.g. opening /data-quality after a deploy). Vite fires
// `vite:preloadError` for exactly this; reload once to pull the fresh index.html
// and its current chunk names. The sessionStorage cooldown stops a reload loop
// when the failure is genuine (offline, real 5xx) rather than a stale build.
window.addEventListener('vite:preloadError', (event) => {
  const RELOAD_KEY = 'jds:chunk-reload-at';
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - lastReload < 10_000) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});

// Rehydrate React Query cache from embedded dehydrated state
const stateEl = document.getElementById('__REACT_QUERY_STATE__');
if (stateEl?.textContent) {
  try {
    const dehydratedState = JSON.parse(stateEl.textContent);
    hydrate(queryClient, dehydratedState);
  } catch (e) {
    console.error('[SSR] Failed to parse dehydrated state:', e);
  }
}

const rootEl = document.getElementById('root')!;

const tree = (
  <ErrorBoundary>
    <ThemeProvider>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

// In production the root is filled by the SSR/prerender step, so we hydrate.
// In plain `vite` dev there is no server markup (the root holds only the
// `<!--app-html-->` comment, so `childElementCount === 0`) — hydrating an empty
// root wedges React on the Suspense fallback of the lazy routes, which reads as
// an endless "Loading…". Client-render instead when there's nothing to hydrate.
if (rootEl.childElementCount > 0) {
  hydrateRoot(rootEl, tree);
} else {
  createRoot(rootEl).render(tree);
}
