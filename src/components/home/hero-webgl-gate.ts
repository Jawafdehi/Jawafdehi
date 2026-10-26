// WebGL eligibility probe for the three.js scenes (hero and donate globe).
//
// Lives in its own module rather than beside a component so it can be unit
// tested without tripping react-refresh/only-export-components, matching
// hero-connection-gate.ts. Both gates import it — a second copy is how the
// donate globe kept throwing after the hero was fixed.

/** Shader stages three.js asks about. */
const SHADERS = ["VERTEX_SHADER", "FRAGMENT_SHADER"] as const;

/**
 * Precisions three.js asks about, and why BOTH are needed.
 *
 * `getMaxPrecision` (three.module.js:2368-2382) tries highp first and falls
 * through to mediump when either highp query reports `precision: 0` — which is
 * the normal answer on a stage that does not support highp, not a failure. It
 * then dereferences `.precision` on the mediump results unguarded.
 *
 * So probing highp alone is not enough: a stack that answers `{precision: 0}`
 * for highp and `null` for mediump passes a highp-only gate and still throws.
 */
const PRECISIONS = ["HIGH_FLOAT", "MEDIUM_FLOAT"] as const;

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");

    // webgl2 ONLY, deliberately — no `?? getContext("webgl")` fallback.
    // three.js has requested `webgl2` exclusively since r163 and throws
    // "THREE.WebGLRenderer: WebGL 1 is not supported since r163." otherwise
    // (three.module.js:16096). Accepting a WebGL1 context here would pass a
    // device that cannot run the scene, download the ~237 KB chunk, and throw —
    // the same failure this gate exists to prevent.
    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) return false;

    // A context is necessary but NOT sufficient. three.js dereferences
    // `.precision` on the result of getShaderPrecisionFormat() without a null
    // check. The spec permits null, and software / limited mobile GL stacks do
    // return it even though getContext() succeeded — that is Sentry's
    // "TypeError: null is not an object (evaluating
    // 'getShaderPrecisionFormat(...).precision')".
    //
    // All four combinations three.js can reach, not just the first two.
    // `!= null` rather than `!== null` so an `undefined` return is rejected too.
    return SHADERS.every((shader) =>
      PRECISIONS.every(
        (precision) =>
          gl.getShaderPrecisionFormat(gl[shader], gl[precision]) != null,
      ),
    );
  } catch {
    return false;
  }
}
