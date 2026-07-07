import { type ReactNode } from "react";
import { Routes, Route } from "react-router-dom";
// Unified admin panel — the entire /admin/* subtree lives here so App.tsx can
// pull it in behind a single React.lazy() boundary. None of these modules (nor
// the OIDC client, admin forms, or casework pages) should ship in the public
// entry chunk: /admin is behind an auth gate that no anonymous visitor clears.
import { AuthProvider } from "react-oidc-context";
import { getUserManager, onSigninCallback } from "./services/oidc";
import { CaseworkAuthProvider } from "./context/CaseworkAuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import EntitiesList from "./pages/admin/entities/EntitiesList";
import EntityCreate from "./pages/admin/entities/EntityCreate";
import EntityEdit from "./pages/admin/entities/EntityEdit";
// Admin data-lake pages. Aliased where the default-export name collides with a
// public browse page (Materials, CourtCases) — kept distinct here even though
// those public pages are no longer imported in this file.
import AdminCourtCases from "./pages/admin/datalake/CourtCases";
import CourtCaseForm from "./pages/admin/datalake/CourtCaseForm";
import AdminMaterials from "./pages/admin/datalake/Materials";
import MaterialForm from "./pages/admin/datalake/MaterialForm";
import Courts from "./pages/admin/datalake/Courts";
import CourtForm from "./pages/admin/datalake/CourtForm";
import Firms from "./pages/admin/datalake/Firms";
import FirmForm from "./pages/admin/datalake/FirmForm";
import AdminCases from "./pages/admin/jawafdehi/AdminCases";
import AdminCaseForm from "./pages/admin/jawafdehi/AdminCaseForm";
import Moderation from "./pages/admin/casework/Moderation";
import CaseworkLogin from "./pages/CaseworkLogin";
import CaseworkCallback from "./pages/CaseworkCallback";
import CaseworkReviews from "./pages/CaseworkReviews";
import CaseworkReviewDetail from "./pages/CaseworkReviewDetail";
import CaseworkRules from "./pages/CaseworkRules";
import CaseworkHow from "./pages/CaseworkHow";

// Wraps the panel in the OIDC AuthProvider. Built as a component (not a spread
// of a config object) so the UserManager is only constructed when this renders
// — under <ClientOnly> in App.tsx, i.e. on the client after hydration, never
// during SSR.
const PortalAuthProvider = ({ children }: { children: ReactNode }) => (
  <AuthProvider userManager={getUserManager()} onSigninCallback={onSigninCallback}>
    {children}
  </AuthProvider>
);

// The /admin/* subtree. Mounted by App.tsx as:
//   <Route path="/admin/*" element={<ClientOnly><AdminApp /></ClientOnly>} />
// login/callback sit OUTSIDE AdminLayout so the auth gate doesn't bounce the
// entry points.
const AdminApp = () => (
  <PortalAuthProvider>
    <CaseworkAuthProvider>
      <Routes>
        <Route path="login" element={<CaseworkLogin />} />
        <Route path="callback" element={<CaseworkCallback />} />
        <Route element={<AdminLayout />}>
          <Route path="" element={<AdminDashboard />} />
          {/* Entities — create/edit before the list so the literal "new" and
              "edit" segments win over the splat. */}
          <Route path="entities/new" element={<EntityCreate />} />
          <Route path="entities/edit/*" element={<EntityEdit />} />
          <Route path="entities" element={<EntitiesList />} />
          {/* Data Lake */}
          <Route path="datalake/courtcases/new" element={<CourtCaseForm />} />
          <Route
            path="datalake/courtcases/:court/:caseNumber/edit"
            element={<CourtCaseForm />}
          />
          <Route path="datalake/courtcases" element={<AdminCourtCases />} />
          <Route path="datalake/courts/new" element={<CourtForm />} />
          <Route
            path="datalake/courts/:identifier/edit"
            element={<CourtForm />}
          />
          <Route path="datalake/courts" element={<Courts />} />
          <Route path="datalake/firms/new" element={<FirmForm />} />
          <Route path="datalake/firms/:id/edit" element={<FirmForm />} />
          <Route path="datalake/firms" element={<Firms />} />
          <Route path="datalake/materials/new" element={<MaterialForm />} />
          <Route path="datalake/materials/edit/*" element={<MaterialForm />} />
          <Route path="datalake/materials" element={<AdminMaterials />} />
          {/* Jawafdehi — create/edit before the list so the literal "new"
              segment wins over the :slug/:id param. */}
          <Route path="jawafdehi/cases/new" element={<AdminCaseForm />} />
          <Route
            path="jawafdehi/cases/:slug/edit"
            element={<AdminCaseForm />}
          />
          <Route path="jawafdehi/cases" element={<AdminCases />} />
          {/* Document Sources removed: the "cases own no documents" ADR
              collapsed sources into Data Lake materials, so there is no
              /api/sources/ write endpoint. Evidence is linked as material IRIs
              on the case; manage docs under Data Lake → Materials. */}
          {/* Casework (folded in from /portal) */}
          <Route path="reviews" element={<CaseworkReviews />} />
          <Route path="reviews/:id" element={<CaseworkReviewDetail />} />
          <Route path="rules" element={<CaseworkRules />} />
          <Route path="how" element={<CaseworkHow />} />
          <Route path="moderation" element={<Moderation />} />
        </Route>
      </Routes>
    </CaseworkAuthProvider>
  </PortalAuthProvider>
);

export default AdminApp;
