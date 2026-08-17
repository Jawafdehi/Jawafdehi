import { Outlet } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SeptemberEventBar } from "@/components/SeptemberEventBar";
import { NewsletterSignupModal } from "@/components/home/newsletter-signup-modal";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Above the navbar so it shows on every route, not just home. Removes
          itself once the event is past; see september-event.ts. */}
      <SeptemberEventBar />
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
