// Connection/device policy for the WebGL hero (PR #359 review, item 2).
//
// The three.js chunk is ~237 KB of transfer that is pure decoration: the
// static map backdrop is the designed fallback, not an error state. Readers
// who have turned on Data Saver, or who are on a 2g/3g-class connection, or
// whose device reports little memory, should never pay for the download at
// all — gating render alone (as the other gates do) still costs the bytes.
//
// Pure function so it can be unit-tested without stubbing `navigator`:
// hero-scene-gate.tsx reads the live values and passes them in.
//
// Convention (shared with hero-particle-budget.ts): an UNDEFINED signal means
// the browser does not expose the API, and we treat that as capable. Safari
// and Firefox expose neither Network Information nor Device Memory; browsers
// that DO expose them are exactly the Chromium-on-Android population the
// policy is for.

/** Connection types that indicate the download is unaffordable. */
const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

export type ConnectionSignals = {
  /** navigator.connection.saveData — the reader explicitly asked to save bytes. */
  saveData?: boolean;
  /** navigator.connection.effectiveType — measured connection class. */
  effectiveType?: string;
  /** navigator.deviceMemory — device RAM bucket in GiB (0.25..8). */
  deviceMemory?: number;
};

/** True when the decorative 3D hero chunk may be downloaded at all. */
export function heroSceneAffordable({ saveData, deviceMemory, effectiveType }: ConnectionSignals): boolean {
  if (saveData === true) return false;
  if (effectiveType !== undefined && SLOW_EFFECTIVE_TYPES.has(effectiveType)) return false;
  if (deviceMemory !== undefined && deviceMemory < 4) return false;
  return true;
}

/** Read the live signals off `navigator` (absent APIs stay undefined). */
export function readConnectionSignals(nav: Navigator = navigator): ConnectionSignals {
  // Network Information API is not in TS's Navigator type yet.
  const connection = (nav as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return {
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    deviceMemory: (nav as { deviceMemory?: number }).deviceMemory,
  };
}
