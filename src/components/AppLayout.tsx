import { Outlet } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { EventPostponedBar } from "@/components/EventPostponedBar";
import { NewsletterSignupModal } from "@/components/home/newsletter-signup-modal";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Above the navbar so it shows on every route, not just home. Removes
          itself once the postponed session's start time is past; see
          event-postponed.ts. */}
      <EventPostponedBar />
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
