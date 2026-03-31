import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { hydrate } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './i18n/config';

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

hydrateRoot(
  document.getElementById('root')!,
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);
