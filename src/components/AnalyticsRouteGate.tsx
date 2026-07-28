import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  applyAnalyticsPathSuppression,
  installAnalyticsNavigationSuppression,
} from "@/lib/ga";

/**
 * Keeps Google Analytics muted on admin/casework routes across client-side
 * navigation. `loadGoogleAnalytics` already refuses to load gtag.js while the
 * entry route is excluded; this covers the other direction — a visitor who
 * accepted analytics on a public page and then navigates into `/admin`.
 *
 * The synchronous history guard (installed once on mount) sets gtag's
 * `ga-disable-<id>` opt-out flag for the target path *during* the navigation
 * call, so it beats GA4 Enhanced Measurement's own history-change page_view even
 * on the first hop into an admin route. The per-route effect is a belt-and-
 * suspenders reconcile for the initial paint and any navigation the history
 * guard didn't originate (e.g. a direct `history` API call).
 *
 * Renders nothing. Effect-only, so it is inert during SSR/pre-render.
 */
export function AnalyticsRouteGate() {
  const { pathname } = useLocation();

  useEffect(() => {
    installAnalyticsNavigationSuppression();
  }, []);

  useEffect(() => {
    applyAnalyticsPathSuppression(pathname);
  }, [pathname]);

  return null;
}
