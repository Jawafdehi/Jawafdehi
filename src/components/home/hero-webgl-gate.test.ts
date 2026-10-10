import { describe, it, expect, vi, afterEach } from "vitest";

import { webglSupported } from "@/components/home/hero-webgl-gate";

/**
 * The WebGL eligibility probe.
 *
 * Two things make a device ineligible, and both used to slip through:
 *   - no webgl2 context (three.js has not supported WebGL1 since r163)
 *   - a context whose getShaderPrecisionFormat() returns null, which three.js
 *     dereferences without a null check
 */

const VERTEX_SHADER = 0x8b31;
const FRAGMENT_SHADER = 0x8b30;
const HIGH_FLOAT = 0x8df2;

type Format = WebGLShaderPrecisionFormat | null | undefined;

function makeContext(
  precisionFor: (shader: number) => Format = () =>
    ({ precision: 23, rangeMin: 127, rangeMax: 127 }) as WebGLShaderPrecisionFormat,
) {
  return {
    VERTEX_SHADER,
    FRAGMENT_SHADER,
    HIGH_FLOAT,
    getShaderPrecisionFormat: vi.fn((shader: number) => precisionFor(shader)),
  };
}

/** Stub a canvas whose getContext answers per context name. */
function stubCanvas(contexts: Record<string, unknown>) {
  const canvas = {
    getContext: vi.fn((name: string) => contexts[name] ?? null),
  } as unknown as HTMLCanvasElement;
  vi.spyOn(document, "createElement").mockReturnValue(canvas);
  return canvas;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("webglSupported", () => {
  it("accepts a webgl2 context that reports shader precision", () => {
    stubCanvas({ webgl2: makeContext() });

    expect(webglSupported()).toBe(true);
  });

  it("rejects a device with no context at all", () => {
    stubCanvas({});

    expect(webglSupported()).toBe(false);
  });

  it("rejects a WebGL1-only device", () => {
    // The regression this file was extended for: three.js requests webgl2
    // exclusively since r163 and throws on anything else, so a webgl1 context
    // must NOT count as support even though it is a perfectly good context.
    stubCanvas({ webgl: makeContext() });

    expect(webglSupported()).toBe(false);
  });

  it("never asks for a webgl1 context", () => {
    const canvas = stubCanvas({ webgl2: makeContext() });

    webglSupported();

    const requested = (canvas.getContext as unknown as { mock: { calls: string[][] } })
      .mock.calls.map((c) => c[0]);
    expect(requested).toEqual(["webgl2"]);
  });

  it("rejects a context whose getShaderPrecisionFormat returns null", () => {
    stubCanvas({ webgl2: makeContext(() => null) });

    expect(webglSupported()).toBe(false);
  });

  it("rejects a context that fails only on the fragment shader", () => {
    // three.js queries both shader types; probing only the vertex one let this
    // device through.
    stubCanvas({
      webgl2: makeContext((shader) =>
        shader === FRAGMENT_SHADER
          ? null
          : ({ precision: 23 } as WebGLShaderPrecisionFormat),
      ),
    });

    expect(webglSupported()).toBe(false);
  });

  it("rejects a context that returns undefined rather than null", () => {
    stubCanvas({ webgl2: makeContext(() => undefined) });

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
      webgl2: makeContext(() => {
        throw new Error("lost context");
      }),
    });

    expect(webglSupported()).toBe(false);
  });
});
