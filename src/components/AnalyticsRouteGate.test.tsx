import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  MemoryRouter,
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import { AnalyticsRouteGate } from "./AnalyticsRouteGate";
import { JAWAFDEHI_GA_MEASUREMENT_ID } from "@/config/analytics-config";

const DISABLE_KEY = `ga-disable-${JAWAFDEHI_GA_MEASUREMENT_ID}`;
const gaDisabled = () =>
  (window as unknown as Record<string, unknown>)[DISABLE_KEY];

afterEach(() => {
  delete (window as unknown as Record<string, unknown>)[DISABLE_KEY];
});

describe("AnalyticsRouteGate", () => {
  it("mutes analytics when the entry route is under /admin", () => {
    render(
      <MemoryRouter initialEntries={["/admin/cases"]}>
        <AnalyticsRouteGate />
      </MemoryRouter>,
    );
    expect(gaDisabled()).toBe(true);
  });

  it("leaves analytics active on public routes", () => {
    render(
      <MemoryRouter initialEntries={["/cases"]}>
        <AnalyticsRouteGate />
      </MemoryRouter>,
    );
    expect(gaDisabled()).toBe(false);
  });

  it("mutes on navigation into /admin and un-mutes on the way back out", () => {
    render(
      <MemoryRouter initialEntries={["/cases"]}>
        <AnalyticsRouteGate />
        <Routes>
          <Route
            path="/cases"
            element={<Link to="/admin/entities">to-admin</Link>}
          />
          <Route
            path="/admin/entities"
            element={<Link to="/cases">to-public</Link>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(gaDisabled()).toBe(false);
    fireEvent.click(screen.getByRole("link", { name: "to-admin" }));
    expect(gaDisabled()).toBe(true);
    fireEvent.click(screen.getByRole("link", { name: "to-public" }));
    expect(gaDisabled()).toBe(false);
  });

  // Deterministic guard against the GA4 Enhanced Measurement race: EM wraps
  // history.pushState and fires a page_view synchronously on SPA navigation.
  // This test installs a faithful EM emulation (wrapping pushState AFTER our
  // guard, as a later-loading gtag.js would) that records a page_view for the
  // new path UNLESS the property is opted out — and asserts the /admin hop
  // leaks nothing while the public hop is still tracked.
  it("emits no GA history page_view when navigating public -> /admin (real window.history)", () => {
    window.history.replaceState({}, "", "/cases");

    render(
      <BrowserRouter>
        <AnalyticsRouteGate />
        <Routes>
          <Route
            path="/cases"
            element={<Link to="/admin/entities">to-admin</Link>}
          />
          <Route
            path="/admin/entities"
            element={<Link to="/cases">to-public</Link>}
          />
        </Routes>
      </BrowserRouter>,
    );

    const gaHits: string[] = [];
    // At this point window.history.pushState is our guard's wrapper (installed
    // on mount). Emulate EM stacking on top of it.
    const guarded = window.history.pushState;
    const emPushState = function (
      this: History,
      ...args: Parameters<History["pushState"]>
    ): void {
      guarded.apply(this, args); // guard sets ga-disable, then commits the URL
      if (!gaDisabled()) gaHits.push(window.location.pathname);
    } as typeof window.history.pushState;
    window.history.pushState = emPushState;

    try {
      fireEvent.click(screen.getByRole("link", { name: "to-admin" }));
      expect(window.location.pathname).toBe("/admin/entities");
      expect(gaDisabled()).toBe(true);
      expect(gaHits).not.toContain("/admin/entities");

      fireEvent.click(screen.getByRole("link", { name: "to-public" }));
      expect(window.location.pathname).toBe("/cases");
      expect(gaDisabled()).toBe(false);
      expect(gaHits).toContain("/cases");
    } finally {
      window.history.pushState = guarded;
      window.history.replaceState({}, "", "/");
    }
  });
});
