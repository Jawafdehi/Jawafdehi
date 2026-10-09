// WebGL eligibility probe for the hero scene.
//
// Lives in its own module rather than beside the component so it can be unit
// tested without tripping react-refresh/only-export-components, matching
// hero-connection-gate.ts.

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ??
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    // A context is necessary but NOT sufficient. three.js calls
    // getShaderPrecisionFormat() while constructing WebGLRenderer and
    // dereferences `.precision` on the result without a null check. The spec
    // permits null, and software / limited mobile GL stacks do return it even
    // though getContext() succeeded — so the old Boolean(context) probe let
    // those devices through and the scene threw instead of falling back.
    //
    // That is Sentry's "TypeError: null is not an object (evaluating
    // 'getShaderPrecisionFormat(VERTEX_SHADER, HIGH_FLOAT).precision')". Probing
    // the same call here keeps the failure in the gate, where the documented
    // behaviour is to render nothing and leave the static backdrop up.
    return gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT) !== null;
  } catch {
    return false;
  }
}
