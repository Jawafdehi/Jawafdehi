import { describe, it, expect, vi, afterEach } from "vitest";

import { webglSupported } from "@/components/home/hero-webgl-gate";

/**
 * The WebGL eligibility probe.
 *
 * A context alone is not proof the scene can mount: three.js dereferences
 * `getShaderPrecisionFormat(...).precision` without a null check while building
 * WebGLRenderer, and the spec permits null. Devices that return null used to
 * pass this gate and then throw — Sentry's "TypeError: null is not an object".
 */

type Ctx = Partial<WebGLRenderingContext> | null;

function stubCanvas(ctx: Ctx) {
  const canvas = {
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;

  return vi.spyOn(document, "createElement").mockReturnValue(canvas);
}

const workingContext: Ctx = {
  VERTEX_SHADER: 0x8b31,
  HIGH_FLOAT: 0x8df2,
  getShaderPrecisionFormat: () =>
    ({ precision: 23, rangeMin: 127, rangeMax: 127 }) as WebGLShaderPrecisionFormat,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("webglSupported", () => {
  it("accepts a context that reports a shader precision format", () => {
    stubCanvas(workingContext);

    expect(webglSupported()).toBe(true);
  });

  it("rejects a device with no context at all", () => {
    stubCanvas(null);

    expect(webglSupported()).toBe(false);
  });

  it("rejects a context whose getShaderPrecisionFormat returns null", () => {
    // The regression. This device HAS a context, so the old Boolean(context)
    // probe let it through and three.js threw on `.precision`.
    stubCanvas({ ...workingContext, getShaderPrecisionFormat: () => null });

    expect(webglSupported()).toBe(false);
  });

  it("rejects a device whose getContext throws", () => {
    const canvas = {
      getContext: vi.fn(() => {
        throw new Error("context creation blocked");
      }),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    expect(webglSupported()).toBe(false);
  });

  it("rejects a device whose getShaderPrecisionFormat throws", () => {
    stubCanvas({
      ...workingContext,
      getShaderPrecisionFormat: () => {
        throw new Error("lost context");
      },
    });

    expect(webglSupported()).toBe(false);
  });
});
