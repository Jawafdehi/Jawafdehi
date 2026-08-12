// @vitest-environment node
//
// MUST stay on the node environment. The default jsdom environment provides a
// `window`, which is exactly what hides this bug: the SSR/pre-render path runs in
// bun with no `window` at all.
import { describe, expect, it } from "vitest";

import { getAccessToken } from "@/services/oidc";

describe("the request path with no window (SSR / pre-render)", () => {
  it("resolves no token instead of throwing", async () => {
    // `http.ts`'s request interceptor awaits this on every request, and
    // createUserManager() reads `window.location.origin` unguarded. When this
    // threw, every entry-server.tsx prefetch failed before its request was sent,
    // Promise.allSettled swallowed it, and the prerendered HTML shipped
    // `{"queries":[]}` — a silent failure with no error and no failing test.
    expect(typeof window).toBe("undefined");
    await expect(getAccessToken()).resolves.toBeNull();
  });
});
