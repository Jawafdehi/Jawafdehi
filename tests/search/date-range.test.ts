import { describe, it, expect } from "vitest";

import {
  activePreset,
  DATE_PRESETS,
  describeDateRange,
  localIsoDate,
  parseDateBound,
  presetStartDate,
  readDateBounds,
} from "@/lib/date-range";

// Stand-in for i18next's `t`: returns the interpolated English default, which is
// what renders when the Nepali bundle has no override.
const translate = (_key: string, options?: Record<string, unknown>) => {
  const template = String(options?.defaultValue ?? "");
  return template.replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name]));
};

describe("parseDateBound", () => {
  it("accepts the one format the API does", () => {
    expect(parseDateBound("2026-09-10")).toBe("2026-09-10");
    expect(parseDateBound("1990-01-01")).toBe("1990-01-01");
  });

  it("rejects a malformed bound rather than sending it", () => {
    // Each of these is a 400 from DRF's DateField, which this page renders as the
    // red "could not be loaded" alert — a stale bookmark must degrade into a
    // wider result set, not into what reads as a search outage.
    for (const bad of [
      "15/01/2026",
      "2026-9-10",
      "2026/09/10",
      "2026-09-10T00:00:00Z",
      "yesterday",
      " 2026-09-10",
      "",
      null,
    ]) {
      expect(parseDateBound(bad)).toBeUndefined();
    }
  });

  it("rejects a date the calendar does not have", () => {
    // The regex alone admits these. "2026-02-31" would be silently read as
    // 3 March, which is a filter nobody asked for; the API 400s it outright.
    expect(parseDateBound("2026-02-31")).toBeUndefined();
    expect(parseDateBound("2026-13-01")).toBeUndefined();
    expect(parseDateBound("2026-00-10")).toBeUndefined();
    expect(parseDateBound("2025-02-29")).toBeUndefined();
    // ...but a real leap day survives.
    expect(parseDateBound("2024-02-29")).toBe("2024-02-29");
  });

  it("round-trips exactly, because the value re-enters the URL and the request", () => {
    const raw = "2026-09-10";
    expect(String(parseDateBound(raw))).toBe(raw);
  });
});

describe("readDateBounds", () => {
  it("reads both bounds", () => {
    const params = new URLSearchParams({
      date_from: "2020-01-01",
      date_to: "2024-12-31",
    });
    expect(readDateBounds(params)).toEqual({
      from: "2020-01-01",
      to: "2024-12-31",
    });
  });

  it("keeps one bound when only one is given", () => {
    expect(readDateBounds(new URLSearchParams({ date_from: "2020-01-01" })))
      .toEqual({ from: "2020-01-01", to: undefined });
    expect(readDateBounds(new URLSearchParams({ date_to: "2020-01-01" })))
      .toEqual({ from: undefined, to: "2020-01-01" });
  });

  it("drops BOTH halves of an inverted pair", () => {
    // There is no way to tell which one was meant, and honouring either applies
    // a filter nobody asked for. The API answers the pair with a 400, so this is
    // also what keeps the first render from firing one.
    const params = new URLSearchParams({
      date_from: "2024-12-31",
      date_to: "2020-01-01",
    });
    expect(readDateBounds(params)).toEqual({});
  });

  it("treats an equal pair as a valid single day, not as inverted", () => {
    const params = new URLSearchParams({
      date_from: "2026-09-10",
      date_to: "2026-09-10",
    });
    expect(readDateBounds(params)).toEqual({
      from: "2026-09-10",
      to: "2026-09-10",
    });
  });

  it("drops a malformed bound while keeping the good one", () => {
    const params = new URLSearchParams({
      date_from: "2026-02-31",
      date_to: "2024-12-31",
    });
    expect(readDateBounds(params)).toEqual({
      from: undefined,
      to: "2024-12-31",
    });
  });
});

describe("localIsoDate", () => {
  it("formats the LOCAL date, not the UTC one", () => {
    // The bug this exists to prevent: `toISOString().slice(0, 10)` on a Date at
    // local midnight in Nepal (+05:45) formats as the PREVIOUS day, so "last 30
    // days" would silently start a day early. Constructed from local parts so
    // the assertion holds in any TZ the suite runs under.
    const date = new Date(2026, 8, 10, 0, 30, 0);
    expect(localIsoDate(date)).toBe("2026-09-10");
  });

  it("zero-pads month and day", () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("presetStartDate", () => {
  const today = new Date(2026, 8, 10);

  it("sets a lower bound only, so a future-dated document is not excluded", () => {
    // The corpus carries them — a procurement notice dated for its own deadline.
    // Pinning `to` at today would drop them from every preset.
    expect(presetStartDate("30-days", today)).toBe("2026-08-11");
    expect(presetStartDate("6-months", today)).toBe("2026-03-10");
    expect(presetStartDate("1-year", today)).toBe("2025-09-10");
  });

  it("returns nothing for All time", () => {
    expect(presetStartDate("all", today)).toBe("");
  });

  it("emits a bound the API would accept, for every preset", () => {
    // The whole point of deriving these rather than typing them: a preset must
    // never be the thing that mints a 400.
    for (const preset of DATE_PRESETS) {
      const start = presetStartDate(preset, today);
      if (!start) continue;
      expect(parseDateBound(start)).toBe(start);
    }
  });
});

describe("activePreset", () => {
  const today = new Date(2026, 8, 10);

  it("reads All time off an empty pair", () => {
    expect(activePreset({}, today)).toBe("all");
  });

  it("recognises each preset's own bound", () => {
    for (const preset of DATE_PRESETS) {
      const from = presetStartDate(preset, today);
      const bounds = from ? { from } : {};
      expect(activePreset(bounds, today)).toBe(preset);
    }
  });

  it("calls a hand-picked range custom, not a preset", () => {
    expect(activePreset({ from: "2020-01-01", to: "2024-12-31" }, today)).toBeNull();
    expect(activePreset({ from: "2020-01-01" }, today)).toBeNull();
    // An upper bound alone is never a preset — presets only ever set `from`.
    expect(activePreset({ to: "2024-12-31" }, today)).toBeNull();
  });

  it("stops treating yesterday's preset bound as pressed", () => {
    // Presets are derived, not stored, so the same URL means something different
    // tomorrow: a `from` that was "30 days ago" yesterday is 31 days ago today
    // and must read as a custom range rather than lighting the wrong pill.
    const yesterday = new Date(2026, 8, 9);
    const from = presetStartDate("30-days", yesterday);
    expect(activePreset({ from }, yesterday)).toBe("30-days");
    expect(activePreset({ from }, today)).toBeNull();
  });
});

describe("describeDateRange", () => {
  it("names each shape of range for the pill", () => {
    expect(describeDateRange("2020-01-01", "2024-12-31", translate)).toBe(
      "2020-01-01 – 2024-12-31",
    );
    expect(describeDateRange("2020-01-01", undefined, translate)).toBe(
      "2020-01-01 onwards",
    );
    expect(describeDateRange(undefined, "2024-12-31", translate)).toBe(
      "Up to 2024-12-31",
    );
    expect(describeDateRange(undefined, undefined, translate)).toBe("Any date");
  });
});
