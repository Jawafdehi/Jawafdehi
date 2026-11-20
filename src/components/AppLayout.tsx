import { Outlet } from "react-router-dom";

import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SocialBar } from "@/components/SocialBar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <SocialBar />
      <Navbar />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
