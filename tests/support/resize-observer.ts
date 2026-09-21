/**
 * A no-op `ResizeObserver` for jsdom, installed on import.
 *
 * Radix's Slider measures its thumbs through `ResizeObserver`, which jsdom does
 * not implement — without this, rendering anything containing the बिगो range
 * control throws before a single assertion runs. A no-op is enough: the tests
 * that need it assert roles, labels and text rather than geometry.
 *
 * A module rather than a copy in each test file, because two files now need it
 * (`SearchFilters.test.tsx` and `tests/search/ArchiveSearch.test.tsx`) and a
 * third will not think to add it. Deliberately NOT wired into `setupFiles`,
 * which this repo keeps empty — an explicit import says which suites depend on
 * a shimmed DOM, and installing it globally would hide a real missing-API
 * failure in some future suite that should have been told about it.
 *
 * `??=` so a genuine implementation (a future jsdom, or a browser-mode run) is
 * never clobbered.
 */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
