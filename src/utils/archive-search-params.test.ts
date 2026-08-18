import { describe, it, expect } from "vitest";
import {
  normalizeArchiveSearchParams,
  setArchiveSearchParam,
} from "./archive-search-params";

const normalize = (query: string) =>
  normalizeArchiveSearchParams(new URLSearchParams(query));

describe("normalizeArchiveSearchParams — बिगो bounds", () => {
  it("keeps a valid pair untouched", () => {
    const next = normalize("type=case&bigo_min=10000000&bigo_max=99999999");
    expect(next.get("bigo_min")).toBe("10000000");
    expect(next.get("bigo_max")).toBe("99999999");
  });

  it("keeps an open-ended bound", () => {
    expect(normalize("bigo_min=1000000000").get("bigo_min")).toBe("1000000000");
    expect(normalize("bigo_max=9999999").get("bigo_max")).toBe("9999999");
  });

  it("keeps a zero lower bound", () => {
    // 0 is a real amount the index holds, so the emptiness test has to be
    // `undefined` rather than falsiness — same rule as the API's serializer.
    expect(normalize("bigo_min=0").get("bigo_min")).toBe("0");
  });

  it("drops a malformed bound instead of forwarding a 400", () => {
    // The endpoint refuses each of these. Forwarding one turns a stale URL into
    // the red "could not be loaded" alert, which reads as a search outage.
    ["bigo_min=-1", "bigo_min=abc", "bigo_max=1e9", "bigo_max=1.5"].forEach(
      (query) => {
        const next = normalize(query);
        expect(next.get("bigo_min")).toBeNull();
        expect(next.get("bigo_max")).toBeNull();
      },
    );
  });

  it("drops BOTH bounds when the range is inverted", () => {
    // The API answers min > max with a 400 rather than an empty page. There is
    // no way to tell which half the reader meant, so keeping either one would
    // apply a filter they never asked for.
    const next = normalize("bigo_min=100000000&bigo_max=10000000");
    expect(next.get("bigo_min")).toBeNull();
    expect(next.get("bigo_max")).toBeNull();
  });

  it("allows an equal pair — that is an exact-amount lookup, not inverted", () => {
    const next = normalize("bigo_min=500&bigo_max=500");
    expect(next.get("bigo_min")).toBe("500");
    expect(next.get("bigo_max")).toBe("500");
  });

  it("leaves an absent range absent", () => {
    const next = normalize("q=x");
    expect(next.get("bigo_min")).toBeNull();
    expect(next.get("bigo_max")).toBeNull();
  });
});

describe("setArchiveSearchParam — बिगो bounds", () => {
  it("writes a zero bound rather than treating it as a clear", () => {
    const next = setArchiveSearchParam(new URLSearchParams(), "bigo_min", 0);
    expect(next.get("bigo_min")).toBe("0");
  });

  it("clears a bound when handed undefined", () => {
    const next = setArchiveSearchParam(
      new URLSearchParams("bigo_min=10000000"),
      "bigo_min",
      undefined,
    );
    expect(next.get("bigo_min")).toBeNull();
  });
});
