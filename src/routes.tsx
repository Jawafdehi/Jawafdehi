import { lazy, type ReactElement } from "react";
import { Route, Navigate } from "react-router-dom";
import { ClientOnly } from "@/components/ClientOnly";
import { PortalRedirect } from "@/components/PortalRedirect";
import { SITE_ROUTES, type RouteChrome, type RoutePath } from "@/data/site-routes";

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
import About from "./pages/About";
import Commitment from "./pages/Commitment";
import OurProcess from "./pages/OurProcess";
import OurTeam from "./pages/OurTeam";
import Volunteer from "./pages/Volunteer";
import OurProducts from "./pages/OurProducts";
import WeeklyMeetings from "./pages/WeeklyMeetings";
import FaqPage from "./pages/FaqPage";
import CaseDetail from "./pages/CaseDetail";
import EntityProfile from "./pages/EntityProfile";
import Feedback from "./pages/Feedback";
import ReportCase from "./pages/ReportCase";
import Updates from "./pages/Updates";
import UpdateDetail from "./pages/UpdateDetail";
import Privacy from "./pages/Privacy";
import TermsOfService from "./pages/TermsOfService";
import ArchiveSearch from "./pages/ArchiveSearch";
import ResearchCorruption from "./pages/ResearchCorruption";
// /materials and /courtcases carry page metadata as of 2026-08-11, so they are
// pre-rendered and the policy above makes them eager. It costs almost nothing:
// both are twenty-line wrappers whose only dependency is ArchiveSearch, already
// eager above, so their lazy chunks held next to no code of their own.
import Materials from "./pages/Materials";
import CourtCases from "./pages/CourtCases";
// /donate, /donate/success and /donate/cancel ARE in PRE_RENDERED_STATIC_ROUTES,
// so per the policy above they must be eager. They were lazy() until 2026-08-11
// and pre-rendered to exactly what that policy predicts: an empty <title> and no
// og: tags at all. tests/ssr/prerendered-routes-eager.test.ts now enforces the
// rule so the two lists cannot silently drift apart again.
import Donate from "./pages/Donate";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";
import DocumentPreviewPage from "./pages/DocumentPreviewPage";

// Lazily imported pages. These routes are not pre-rendered, so client-side code
// splitting costs nothing at SEO/first-paint time and shrinks the entry chunk.
const DataQuality = lazy(() => import("./pages/DataQuality"));
// /author/:slug is NOT pre-rendered (scripts/pre-render.ts enumerates cases,
// entities and updates only — no author pages), so per the split policy above
// it is safe and free to lazy-load. It was eager by association with the other
// detail pages, which ARE pre-rendered and must stay eager.
const AuthorProfile = lazy(() => import("./pages/AuthorProfile"));
const EntityRecordProfile = lazy(() => import("./pages/EntityRecordProfile"));
const MaterialProfile = lazy(() => import("./pages/MaterialProfile"));
const CourtCaseProfile = lazy(() => import("./pages/CourtCaseProfile"));
const UpdatePreview = lazy(() => import("./pages/UpdatePreview"));
const EmbedCaseCard = lazy(() => import("./pages/EmbedCaseCard"));
const NewsletterUnsubscribe = lazy(() => import("./pages/NewsletterUnsubscribe"));
const NewsletterConfirmed = lazy(() => import("./pages/NewsletterConfirmed"));

// The /admin/* subtree — admin CRUD forms and casework pages — lives behind this
// single lazy boundary. /admin is auth-gated and never pre-rendered, so none of it
// belongs in the public entry chunk. Measured: AdminApp is 1.17 MB raw / 379 KB
// gzip and is correctly absent from the initial payload.
//
// ⚠️ ONE EXCEPTION, and it is not this boundary's fault: `oidc-client-ts`
// (121 KB raw / 23 KB gzip) IS in the public entry chunk. It arrives via
// `src/services/http.ts`, which statically imports `getAccessToken` from
// `./oidc` so the shared axios interceptor can attach a bearer token to EVERY
// request — including the anonymous ones on public pages. So the library is
// pulled in by the data layer, not by /admin. This comment used to claim the
// OIDC client was behind this boundary; it was not, and the bundle said so.
// Deferring it means splitting `services/oidc.ts` into a thin token reader plus a
// lazily-imported UserManager, and checking localStorage for a session before
// loading the library at all — see docs/testing/bundle-and-code-splitting.md.
const AdminApp = lazy(() => import("./AdminApp"));

// What to render for each path in SITE_ROUTES.
//
// Typing this as a total Record over RoutePath is what keeps the table and the
// app in step: add a path to SITE_ROUTES and this object fails to compile until
// it has an element; remove one and the leftover key fails too. That is a
// stronger guarantee than the test that used to parse App.tsx's JSX looking for
// `<Route path>` strings, and it fires in the editor rather than in CI.
export const ROUTE_ELEMENTS: Record<RoutePath, ReactElement> = {
  "/embed/case/:id": <EmbedCaseCard />,
  "/document-viewer": <DocumentPreviewPage />,
  // Unified admin panel — the whole subtree is lazy-loaded and wrapped in
  // <ClientOnly> so the OIDC UserManager is only constructed on the client after
  // hydration. Auth (OIDC + an internal role) is gated inside AdminApp.
  "/admin/*": (
    <ClientOnly>
      <AdminApp />
    </ClientOnly>
  ),
  "/portal/*": <PortalRedirect />,

  "/": <Index />,
  "/cases": <Cases />,
  "/case/:id": <CaseDetail />,
  "/search": <ArchiveSearch />,
  "/materials": <Materials />,
  "/courtcases": <CourtCases />,
  "/author/:slug": <AuthorProfile />,
  "/entity/:id": <EntityProfile />,
  "/entity/*": <EntityRecordProfile />,
  "/material/*": <MaterialProfile />,
  "/courtcase/*": <CourtCaseProfile />,
  "/feedback": <Feedback />,
  "/report": <ReportCase />,
  "/updates": <Updates />,
  "/updates/preview": <UpdatePreview />,
  "/updates/:slug": <UpdateDetail />,
  "/faq": <FaqPage />,
  "/about": <About />,
  "/commitment": <Commitment />,
  "/data-quality": <DataQuality />,
  "/research/corruption-accountability": <ResearchCorruption />,
  "/our-process": <OurProcess />,
  "/team": <OurTeam />,
  "/volunteer": <Volunteer />,
  "/donate": <Donate />,
  "/products": <OurProducts />,
  "/saptahik": <WeeklyMeetings />,
  "/privacy": <Privacy />,
  "/terms": <TermsOfService />,
  "/newsletter/confirmed": <NewsletterConfirmed />,
  "/newsletter/unsubscribe/:token": <NewsletterUnsubscribe />,
  "/donate/cancel": <PaymentCancelled />,
  "/donate/success": <PaymentSuccess />,

  // Redirects to a canonical home.
  "/entities": <Navigate to="/search?type=entity" replace />,
  "/information": <Navigate to="/faq" replace />,
  "/moderation": <Navigate to="/admin/moderation" replace />,
};

/** The <Route> elements for one chrome, in table order. */
export const routesWithChrome = (chrome: RouteChrome) =>
  SITE_ROUTES.filter((route) => route.chrome === chrome).map((route) => (
    <Route key={route.path} path={route.path} element={ROUTE_ELEMENTS[route.path]} />
  ));
