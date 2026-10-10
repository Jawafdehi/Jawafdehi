// WebGL eligibility probe for the three.js scenes (hero and donate globe).
//
// Lives in its own module rather than beside a component so it can be unit
// tested without tripping react-refresh/only-export-components, matching
// hero-connection-gate.ts. Both gates import it — a second copy is how the
// donate globe kept throwing after the hero was fixed.

/** Precision queries three.js makes while constructing WebGLRenderer. */
const PRECISION_PROBES = ["VERTEX_SHADER", "FRAGMENT_SHADER"] as const;

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
    // Both shader types are probed because three.js queries both; `!= null`
    // rather than `!== null` so an `undefined` return is rejected too.
    return PRECISION_PROBES.every(
      (shader) => gl.getShaderPrecisionFormat(gl[shader], gl.HIGH_FLOAT) != null,
    );
  } catch {
    return false;
  }
}
