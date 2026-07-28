import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
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
});
