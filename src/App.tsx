import { Suspense, lazy } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClientOnly } from "@/components/ClientOnly";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { SentryErrorFallback } from "@/components/SentryErrorFallback";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
// Eagerly imported pages.
//
// Split policy: this app has NO runtime SSR — HTML is produced at BUILD TIME by
// scripts/pre-render.ts (the Cloudflare Worker only serves static assets + a SPA
// fallback). React 18's renderToString does NOT await React.lazy/Suspense, so a
// lazily-imported page would pre-render as the "Loading…" fallback, shipping
// empty HTML + wrong Helmet meta for that route. Therefore every PRE-RENDERED
// route (see PRE_RENDERED_STATIC_ROUTES in src/data/site-routes.ts, plus the
// dynamic /case/:id, /entity/:id and /updates/:slug routes) MUST stay eager.
// Routes NOT pre-rendered are client-rendered regardless, so they are lazy()
// below to keep them out of the public entry chunk.
import Index from "./pages/Index";
import Cases from "./pages/Cases";
import Entities from "./pages/Entities";
import About from "./pages/About";
import Commitment from "./pages/Commitment";
import OurProcess from "./pages/OurProcess";
import OurTeam from "./pages/OurTeam";
import Volunteer from "./pages/Volunteer";
import OurProducts from "./pages/OurProducts";
import WeeklyMeetings from "./pages/WeeklyMeetings";
import Information from "./pages/Information";
import CaseDetail from "./pages/CaseDetail";
import EntityProfile from "./pages/EntityProfile";
import Feedback from "./pages/Feedback";
import Updates from "./pages/Updates";
import UpdateDetail from "./pages/UpdateDetail";
import Privacy from "./pages/Privacy";
import TermsOfService from "./pages/TermsOfService";
import ArchiveSearch from "./pages/ArchiveSearch";
import NotFound from "./pages/NotFound";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazily imported pages. These routes are not pre-rendered, so client-side code
// splitting costs nothing at SEO/first-paint time and shrinks the entry chunk.
const GuestChat = lazy(() => import("./pages/GuestChat"));
const Donate = lazy(() => import("./pages/Donate"));
const DataQuality = lazy(() => import("./pages/DataQuality"));
const EntityRecordProfile = lazy(() => import("./pages/EntityRecordProfile"));
const MaterialProfile = lazy(() => import("./pages/MaterialProfile"));
const CourtCaseProfile = lazy(() => import("./pages/CourtCaseProfile"));
const EntityResponse = lazy(() => import("./pages/EntityResponse"));
const ModerationDashboard = lazy(() => import("./pages/ModerationDashboard"));
const UpdatePreview = lazy(() => import("./pages/UpdatePreview"));
const EmbedCaseCard = lazy(() => import("./pages/EmbedCaseCard"));
const Materials = lazy(() => import("./pages/Materials"));
const CourtCases = lazy(() => import("./pages/CourtCases"));

// The entire /admin/* subtree — including the OIDC client, admin CRUD forms and
// casework pages — lives behind this single lazy boundary. /admin is auth-gated
// and never pre-rendered, so none of it belongs in the public entry chunk.
const AdminApp = lazy(() => import("./AdminApp"));

// Back-compat redirect: /portal/<rest> -> /admin/<rest> (preserving query).
const PortalRedirect = () => {
  const location = useLocation();
  const dest =
    location.pathname.replace(/^\/portal/, "/admin") + location.search;
  return <Navigate to={dest} replace />;
};

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
        <Routes>
          {/* Embed route for oEmbed iframe */}
          <Route path="/embed/case/:id" element={<EmbedCaseCard />} />

          {/* Unified admin panel — standalone full-screen, mounted at /admin.
              Folds in the former /portal casework pages. Auth: OIDC + an
              internal role (gated inside AdminApp). The whole subtree is
              lazy-loaded and wrapped in <ClientOnly> so the OIDC UserManager
              is only constructed on the client after hydration. */}
          <Route
            path="/admin/*"
            element={
              <ClientOnly>
                <AdminApp />
              </ClientOnly>
            }
          />

          {/* Back-compat: the casework portal moved from /portal to /admin. */}
          <Route path="/portal/*" element={<PortalRedirect />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/case/:id" element={<CaseDetail />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="/search" element={<ArchiveSearch />} />
            {/* Data-lake single-type browse pages (unified-archive search, type-pinned). */}
            <Route path="/materials" element={<Materials />} />
            <Route path="/courtcases" element={<CourtCases />} />
            {/* Legacy Jawafdehi case-entity profile (numeric id, single segment). */}
            <Route path="/entity/:id" element={<EntityProfile />} />
            {/* Entity record by IRI tail (multi-segment, e.g. organization/.../tu).
                React Router prefers the more specific :id route for single-segment
                numeric ids, so this splat only catches the hierarchical entity IRIs. */}
            <Route path="/entity/*" element={<EntityRecordProfile />} />
            {/* Data-lake material by IRI tail (/material/<source>/<ident>). */}
            <Route path="/material/*" element={<MaterialProfile />} />
            {/* Data-lake court case by IRI tail (/courtcase/<court>/<case_number>). */}
            <Route path="/courtcase/*" element={<CourtCaseProfile />} />
            <Route path="/ask" element={<GuestChat />} />
            <Route path="/entity-response/:id" element={<EntityResponse />} />
            <Route path="/moderation" element={<ModerationDashboard />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/updates" element={<Updates />} />
            {/* Wagtail headless preview target — must precede the :slug route. */}
            <Route path="/updates/preview" element={<UpdatePreview />} />
            <Route path="/updates/:slug" element={<UpdateDetail />} />
            <Route path="/information" element={<Information />} />
            <Route path="/about" element={<About />} />
            <Route path="/commitment" element={<Commitment />} />
            <Route path="/data-quality" element={<DataQuality />} />
            <Route path="/our-process" element={<OurProcess />} />
            <Route path="/team" element={<OurTeam />} />
            <Route path="/volunteer" element={<Volunteer />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/products" element={<OurProducts />} />
            <Route path="/saptahik" element={<WeeklyMeetings />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<TermsOfService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </TooltipProvider>
  </Sentry.ErrorBoundary>
);

export default App;
