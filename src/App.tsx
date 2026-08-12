import { Suspense } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClientOnly } from "@/components/ClientOnly";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { SentryErrorFallback } from "@/components/SentryErrorFallback";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AnalyticsRouteGate } from "@/components/AnalyticsRouteGate";
import { routesWithChrome } from "./routes";
import NotFound from "./pages/NotFound";

const RouteLoadingFallback = () => (
  <div
    className="flex min-h-screen items-center justify-center px-4"
    role="status"
    aria-live="polite"
  >
    <span className="text-sm text-muted-foreground">Loading...</span>
  </div>
);

const App = () => (
  <Sentry.ErrorBoundary fallback={({ error, resetError }) => <SentryErrorFallback error={error} resetError={resetError} />}>
    <TooltipProvider>
      <ClientOnly>
        <Toaster />
        <Sonner />
        <CookieConsentBanner />
      </ClientOnly>
      <Suspense fallback={<RouteLoadingFallback />}>
        <ScrollToTop />
        <AnalyticsRouteGate />
        {/* Routes come from SITE_ROUTES in src/data/site-routes.ts — add a route
            there, then give it an element in ROUTE_ELEMENTS in src/routes.tsx.
            Neither compiles without the other. */}
        <Routes>
          {routesWithChrome("standalone")}

          <Route element={<AppLayout />}>
            {routesWithChrome("app")}
            {/* The catch-all is not in the table: it matches every path, which
                would tell the Worker that every path is real. */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </TooltipProvider>
  </Sentry.ErrorBoundary>
);

export default App;
