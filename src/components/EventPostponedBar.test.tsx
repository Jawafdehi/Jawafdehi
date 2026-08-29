// SPDX-License-Identifier: Hippocratic-3.0
//
// The strip that used to live here invited people to the 2/3 September session.
// It is now the notice that the session is off, and these gates are about the
// two ways that swap can go wrong: the invitation surviving somewhere in the
// bundle, and the notice outliving the moment it stops being true.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { EventPostponedBar } from "@/components/EventPostponedBar";
import { EVENT_POSTPONED_NOTICE_ENDS_AT } from "@/lib/event-postponed";
import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";

const LOCALES = { en, ne } as const;

function renderAt(when: string) {
  vi.setSystemTime(new Date(when));
  cleanup();
  localStorage.clear();
  return render(<EventPostponedBar />);
}

describe("Event postponed bar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("says the session is postponed, without asking anyone to register", () => {
    renderAt("2026-08-30T12:00:00Z");

    expect(screen.getByText(/Event postponed/)).toBeTruthy();
    expect(screen.getByText(/We will announce a new date/)).toBeTruthy();
    expect(
      screen.queryByRole("link"),
      "the postponement notice must not carry a registration link — the Zoom " +
        "sign-up is for an event that is no longer happening.",
    ).toBeNull();
  });

  it("expires at 6:45 AM Nepal time on 3 September, when the session would have started", () => {
    expect(EVENT_POSTPONED_NOTICE_ENDS_AT).toBe(Date.parse("2026-09-03T01:00:00Z"));

    // 01:00 UTC is 06:45 NPT (UTC+05:45) and 18:00 Pacific on 2 September.
    const npt = new Date(EVENT_POSTPONED_NOTICE_ENDS_AT + 5.75 * 60 * 60 * 1000);
    expect(npt.toISOString()).toBe("2026-09-03T06:45:00.000Z");
  });

  it("is gone once that moment has passed", () => {
    const { container } = renderAt("2026-09-03T01:00:01Z");
    expect(
      container.querySelector("aside"),
      "the notice must remove itself after the cutoff rather than sit at the " +
        "top of every page indefinitely.",
    ).toBeNull();
  });

  it("stays dismissed, under a key of its own", () => {
    renderAt("2026-08-30T12:00:00Z");
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));

    expect(screen.queryByText(/Event postponed/)).toBeNull();
    expect(localStorage.getItem("jawafdehi.eventPostponed.dismissed")).toBe("true");
    expect(
      localStorage.getItem("jawafdehi.septemberEvent.dismissed"),
      "reusing the old event bar's dismissal key would hide the postponement " +
        "from everyone who dismissed the invitation — the people most likely " +
        "to have registered.",
    ).toBeNull();
  });

  it("leaves no trace of the event announcement in the shipped translations", () => {
    for (const [locale, bundle] of Object.entries(LOCALES)) {
      expect(
        (bundle as Record<string, unknown>).septemberEvent,
        `${locale}.json still carries the septemberEvent block. Those strings ` +
          `invite readers to a session that has been postponed; leaving them in ` +
          `the bundle is how one comes back on a surface nobody rechecked.`,
      ).toBeUndefined();
    }
  });
});
