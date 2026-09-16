import { Outlet } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { LaunchEventBar } from "@/components/LaunchEventBar";
import { NewsletterSignupModal } from "@/components/home/newsletter-signup-modal";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Above the navbar so it shows on every route, not just home. Hides
          itself once the launch session has finished; see launch-event.ts.
          Hiding is not removing — take the component out after 24 September
          rather than leaving an expired bar in the prerendered HTML. */}
      <LaunchEventBar />
      <Navbar />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
      {/* Mounted once for the whole public shell; it self-gates to eligible
          routes (home / case / updates) and arms a dwell timer there. */}
      <NewsletterSignupModal />
    </div>
  );
}
