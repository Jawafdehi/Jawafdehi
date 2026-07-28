import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyAnalyticsPathSuppression } from "@/lib/ga";

/**
 * Keeps Google Analytics muted on admin/casework routes across client-side
 * navigation. `loadGoogleAnalytics` already refuses to load gtag.js while the
 * entry route is excluded; this covers the other direction — a visitor who
 * accepted analytics on a public page and then navigates into `/admin` — by
 * toggling gtag's `ga-disable-<id>` opt-out flag on every route change.
 *
 * Renders nothing. Effect-only, so it is inert during SSR/pre-render.
 */
export function AnalyticsRouteGate() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyAnalyticsPathSuppression(pathname);
  }, [pathname]);

  return null;
}
