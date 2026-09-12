// SPDX-License-Identifier: Hippocratic-3.0
//
// The strip that used to live here said the 2/3 September session was off. It
// is now the invitation to the 23/24 September launch, and these gates are
// about the ways that swap goes wrong: the dead notice surviving somewhere in
// the bundle, a date that sends a Nepal-side reader a day early, copy that
// claims the database is new, and a bar that outlives the event the way the
// last one did.
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { LaunchEventBar } from "@/components/LaunchEventBar";
import { LAUNCH_EVENT_ENDS_AT } from "@/lib/launch-event";
import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";

const LOCALES = { en, ne } as const;

function renderAt(when: string) {
  vi.setSystemTime(new Date(when));
  cleanup();
  localStorage.clear();
  return render(<LaunchEventBar />);
}

describe("Launch event bar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("invites people to the launch, on Zoom, with a link out to it", () => {
    renderAt("2026-09-15T12:00:00Z");

    expect(screen.getByText(/public launch of Nepal's corruption database/)).toBeTruthy();
    expect(screen.getByText(/Zoom/)).toBeTruthy();

    const link = screen.getByRole("link", { name: /Learn more/i });
    expect(link.getAttribute("href")).toBe("https://jawafdehi.org/launch--banner");
  });

  it("uses the doubled-hyphen placement code, not a channel code or the bare slug", () => {
    renderAt("2026-09-15T12:00:00Z");
    const href = screen.getByRole("link", { name: /Learn more/i }).getAttribute("href") ?? "";

    expect(
      href,
      "the bar is a placement on our own site, so it reports separately from " +
        "the channel codes (-fb, -ig, -qr). A single hyphen would sort it into " +
        "the block that answers 'which channel sent them', which is a different " +
        "question. The bare /launch would report as (untagged).",
    ).toMatch(/\/launch--banner$/);
  });

  it("carries both days in both languages, and never a bare US date in Nepali", () => {
    for (const [locale, bundle] of Object.entries(LOCALES)) {
      const sentence = (bundle as { launchEvent: { barSentence: string } }).launchEvent
        .barSentence;

      expect(
        sentence,
        `${locale}.json must name the Nepal day. A reader who sees only the ` +
          `23rd joins twenty-four hours early.`,
      ).toMatch(locale === "ne" ? /२४/ : /24 Sept/);

      expect(
        sentence,
        `${locale}.json must also name the US day, so a diaspora reader is not ` +
          `sent to a Nepal-morning slot they will read as their own evening.`,
      ).toMatch(locale === "ne" ? /२३/ : /23 Sept/);
    }
  });

  it("says public launch, never that the database is launching", () => {
    for (const [locale, bundle] of Object.entries(LOCALES)) {
      const sentence = (bundle as { launchEvent: { barSentence: string } }).launchEvent
        .barSentence;

      expect(
        /public launch|सार्वजनिक सुरुवात/.test(sentence),
        `${locale}.json must frame this as the *public launch*. 80+ cases are ` +
          `already published, so copy implying day one is contradicted by the ` +
          `case history on the site it is advertising.`,
      ).toBe(true);

      expect(
        /goes live|launches on|now live/i.test(sentence),
        `${locale}.json reads as if the database itself is new.`,
      ).toBe(false);
    }
  });

  it("expires after the session ends, at 8:15 AM Nepal time on 24 September", () => {
    expect(LAUNCH_EVENT_ENDS_AT).toBe(Date.parse("2026-09-24T02:30:00Z"));

    // The session starts at 01:00 UTC — 6:00 PM Pacific (UTC-7, still daylight
    // time on 23 September) and 6:45 AM in Nepal (UTC+05:45) the next morning.
    const startNpt = new Date(Date.parse("2026-09-24T01:00:00Z") + 5.75 * 60 * 60 * 1000);
    expect(startNpt.toISOString()).toBe("2026-09-24T06:45:00.000Z");
  });

  it("is gone once the session is over", () => {
    const { container } = renderAt("2026-09-24T02:30:01Z");
    expect(
      container.querySelector("aside"),
      "the bar must remove itself after the session rather than sit at the top " +
        "of every page inviting people to something that has happened. The " +
        "notice it replaces spent nine days doing exactly that.",
    ).toBeNull();
  });

  it("stays dismissed, under a key of its own", () => {
    renderAt("2026-09-15T12:00:00Z");
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));

    expect(screen.queryByText(/public launch of Nepal's corruption database/)).toBeNull();
    expect(localStorage.getItem("jawafdehi.launchEvent.dismissed")).toBe("true");

    for (const stale of [
      "jawafdehi.septemberEvent.dismissed",
      "jawafdehi.eventPostponed.dismissed",
    ]) {
      expect(
        localStorage.getItem(stale),
        `reusing ${stale} would hide the launch from everyone who dismissed the ` +
          `session it replaces or the notice that it was off — the people most ` +
          `likely to be looking for where it went.`,
      ).toBeNull();
    }
  });

  it("paints itself amber, never navy — the home hero is navy and swallowed it", () => {
    const { container } = renderAt("2026-09-15T12:00:00Z");
    const aside = container.querySelector("aside");

    expect(
      aside?.className,
      "the strip sits on the full-bleed navy hero under a transparent navbar; " +
        "a navy fill is invisible exactly where most visitors land. Measured: " +
        "amber is 5.94:1 against the hero, crimson 2.60:1, navy 1.00:1.",
    ).toContain("bg-alert");
    expect(aside?.className).not.toContain("bg-primary");
  });

  it("leaves no trace of the postponed or September blocks in the shipped translations", () => {
    for (const [locale, bundle] of Object.entries(LOCALES)) {
      expect(
        (bundle as Record<string, unknown>).septemberEvent,
        `${locale}.json still carries the septemberEvent block, which invites ` +
          `readers to a session that was postponed and has been superseded.`,
      ).toBeUndefined();
    }
  });
});
