import { Suspense, lazy, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClientOnly } from "@/components/ClientOnly";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { SentryErrorFallback } from "@/components/SentryErrorFallback";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
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
import EntityResponse from "./pages/EntityResponse";
import ModerationDashboard from "./pages/ModerationDashboard";
import Feedback from "./pages/Feedback";
import Updates from "./pages/Updates";
import UpdateDetail from "./pages/UpdateDetail";
import UpdatePreview from "./pages/UpdatePreview";
import EmbedCaseCard from "./pages/EmbedCaseCard";
import Privacy from "./pages/Privacy";
import TermsOfService from "./pages/TermsOfService";
import ArchiveSearch from "./pages/ArchiveSearch";
import NotFound from "./pages/NotFound";
import { ScrollToTop } from "@/components/ScrollToTop";
// Casework portal (VOL-3) — mounted at /portal.
import { AuthProvider } from "react-oidc-context";
import { getUserManager, onSigninCallback } from "./services/oidc";
import { CaseworkAuthProvider } from "./context/CaseworkAuthContext";
import CaseworkLogin from "./pages/CaseworkLogin";
import CaseworkCallback from "./pages/CaseworkCallback";
import CaseworkReviews from "./pages/CaseworkReviews";
import CaseworkReviewDetail from "./pages/CaseworkReviewDetail";
import CaseworkRules from "./pages/CaseworkRules";
import CaseworkHow from "./pages/CaseworkHow";
import PaymentCancelled from "./pages/PaymentCancelled";
import PaymentSuccess from "./pages/PaymentSuccess";

const GuestChat = lazy(() => import("./pages/GuestChat"));
const Donate = lazy(() => import("./pages/Donate"));

// Wraps the portal in the OIDC AuthProvider. Built as a component (not a spread
// of a config object) so the UserManager is only constructed when this renders
// — under <ClientOnly>, i.e. on the client after hydration, never during SSR.
const PortalAuthProvider = ({ children }: { children: ReactNode }) => (
  <AuthProvider userManager={getUserManager()} onSigninCallback={onSigninCallback}>
    {children}
  </AuthProvider>
);

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

          {/* Casework portal (VOL-3) — standalone full-screen, mounted at /portal.
              Auth: OIDC + Contributor role. */}
          <Route
            path="/portal/*"
            element={
              <ClientOnly>
                <PortalAuthProvider>
                  <CaseworkAuthProvider>
                    <Routes>
                      <Route path="login" element={<CaseworkLogin />} />
                      <Route path="callback" element={<CaseworkCallback />} />
                      <Route path="reviews" element={<CaseworkReviews />} />
                      <Route path="reviews/:id" element={<CaseworkReviewDetail />} />
                      <Route path="rules" element={<CaseworkRules />} />
                      <Route path="how" element={<CaseworkHow />} />
                      <Route path="" element={<CaseworkReviews />} />
                    </Routes>
                  </CaseworkAuthProvider>
                </PortalAuthProvider>
              </ClientOnly>
            }
          />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/case/:id" element={<CaseDetail />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="/search" element={<ArchiveSearch />} />
            <Route path="/entity/:id" element={<EntityProfile />} />
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
            <Route path="/our-process" element={<OurProcess />} />
            <Route path="/team" element={<OurTeam />} />
            <Route path="/volunteer" element={<Volunteer />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/products" element={<OurProducts />} />
            <Route path="/saptahik" element={<WeeklyMeetings />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cancel" element={<PaymentCancelled />} />
            <Route path="/success" element={<PaymentSuccess />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </TooltipProvider>
  </Sentry.ErrorBoundary>
);

export default App;
