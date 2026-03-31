import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Cases from "./pages/Cases";
import Entities from "./pages/Entities";
import About from "./pages/About";
import Commitment from "./pages/Commitment";
import OurProcess from "./pages/OurProcess";
import OurTeam from "./pages/OurTeam";
import Volunteer from "./pages/Volunteer";
import OurProducts from "./pages/OurProducts";
import Information from "./pages/Information";
import CaseDetail from "./pages/CaseDetail";
import EntityProfile from "./pages/EntityProfile";
import ReportAllegation from "./pages/ReportAllegation";
import EntityResponse from "./pages/EntityResponse";
import ModerationDashboard from "./pages/ModerationDashboard";
import Feedback from "./pages/Feedback";
import Updates from "./pages/Updates";
import UpdateDetail from "./pages/UpdateDetail";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/cases" element={<Cases />} />
      <Route path="/case/:id" element={<CaseDetail />} />
      <Route path="/entities" element={<Entities />} />
      <Route path="/entity/:id" element={<EntityProfile />} />
      <Route path="/report" element={<ReportAllegation />} />
      <Route path="/entity-response/:id" element={<EntityResponse />} />
      <Route path="/moderation" element={<ModerationDashboard />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/updates" element={<Updates />} />
      <Route path="/updates/:id" element={<UpdateDetail />} />
      <Route path="/information" element={<Information />} />
      <Route path="/about" element={<About />} />
      <Route path="/commitment" element={<Commitment />} />
      <Route path="/our-process" element={<OurProcess />} />
      <Route path="/team" element={<OurTeam />} />
      <Route path="/volunteer" element={<Volunteer />} />
      <Route path="/products" element={<OurProducts />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
