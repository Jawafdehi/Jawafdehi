// Particle budget for the WebGL hero (hero-scene.tsx). Kept as a tiny pure
// module so the policy is unit-testable without pulling three.js into a test.
//
// Low-end devices get half the particles: `navigator.deviceMemory` (Chrome
// only; undefined elsewhere) and `hardwareConcurrency` at or below 4 are the
// standard cheap signals for "this machine will drop frames". Undefined
// values are treated as capable — Firefox/Safari never expose deviceMemory,
// and halving everyone there would punish plenty of fast hardware.

const BASE_DESKTOP = 2600;
const BASE_MOBILE = 1400;
const MOBILE_BREAKPOINT = 768;

export function heroParticleBudget(
  viewportWidth: number,
  deviceMemory: number | undefined,
  hardwareConcurrency: number | undefined,
): number {
  const base = viewportWidth < MOBILE_BREAKPOINT ? BASE_MOBILE : BASE_DESKTOP;
  const lowEnd =
    (typeof deviceMemory === "number" && deviceMemory <= 4) ||
    (typeof hardwareConcurrency === "number" && hardwareConcurrency <= 4);
  return lowEnd ? base / 2 : base;
}
