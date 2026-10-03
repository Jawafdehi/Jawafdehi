import { Outlet } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { NewsletterSignupModal } from "@/components/home/newsletter-signup-modal";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
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
