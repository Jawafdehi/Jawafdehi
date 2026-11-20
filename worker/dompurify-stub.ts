// SPDX-License-Identifier: Hippocratic-3.0
// Worker-side stand-in for isomorphic-dompurify (wired by `[alias]` in
// wrangler.toml). The real package needs jsdom, which cannot run in a Worker.
//
// Fails CLOSED: sanitize() returns an empty string, so the server-rendered HTML
// omits the CMS markup rather than ever emitting it unsanitised. Its one user,
// StreamField, renders CMS article bodies, which are not on an edge-rendered
// route; the browser renders with the real DOMPurify either way.

const DOMPurifyStub = {
  sanitize: (_dirty: unknown): string => '',
  addHook: (): void => {},
  removeHook: (): void => {},
  removeAllHooks: (): void => {},
  setConfig: (): void => {},
  clearConfig: (): void => {},
  isSupported: false,
};

export default DOMPurifyStub;
export const sanitize = DOMPurifyStub.sanitize;
