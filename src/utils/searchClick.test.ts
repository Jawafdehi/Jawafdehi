import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendSearchClick } from "./searchClick";
import { telemetryAllowedHere } from "@/lib/telemetry";

vi.mock("@/lib/telemetry", () => ({
  telemetryAllowedHere: vi.fn(() => true),
}));
vi.mock("@/services/http", () => ({ API_BASE_URL: "https://api.example.test" }));

const beacon = vi.fn((_url: string, _body?: string) => true);
const result = {
  type: "entity" as const,
  id: "https://jawafdehi.org/entity/person/x",
  score: 7.5,
};

beforeEach(() => {
  vi.mocked(telemetryAllowedHere).mockReturnValue(true);
  beacon.mockClear();
  vi.stubGlobal("navigator", { sendBeacon: beacon });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendSearchClick", () => {
  it("beacons the join key + clicked result to /api/search/click", () => {
    sendSearchClick({ searchId: "sid-9", rank: 3, result });
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, body] = beacon.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/search/click");
    expect(JSON.parse(body as string)).toEqual({
      search_id: "sid-9",
      rank: 3,
      result_type: "entity",
      result_id: "https://jawafdehi.org/entity/person/x",
      result_score: 7.5,
    });
  });

  it("no-ops when search_id is absent (nothing to join to)", () => {
    sendSearchClick({ searchId: undefined, rank: 1, result });
    expect(beacon).not.toHaveBeenCalled();
  });

  it("no-ops on dev/localhost/preview hosts (not consent — host gating)", () => {
    vi.mocked(telemetryAllowedHere).mockReturnValue(false);
    sendSearchClick({ searchId: "sid-9", rank: 1, result });
    expect(beacon).not.toHaveBeenCalled();
  });

  it("swallows a sendBeacon failure (never affects navigation)", () => {
    beacon.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(() =>
      sendSearchClick({ searchId: "sid-9", rank: 1, result }),
    ).not.toThrow();
  });
});
