// SPDX-License-Identifier: Hippocratic-3.0
// Unit-test stand-in for worker/edge-bundle.ts (aliased in vitest.config.ts).
// The real module imports build output (dist/server/entry-server.js and
// dist/client/index.html), which unit tests do not have. This one fails every
// render, so the Worker takes its meta-injection fallback — the behaviour the
// pre-JAW-80 worker tests pin. Tests of the edge path stub `render` themselves.
import type { EdgeBundle } from '../../worker/edge-render';

export const bundle: EdgeBundle = {
  render: async () => {
    throw new Error('the SSR bundle is not available in unit tests');
  },
  setApiTimeout: () => {},
  setPrerenderToken: () => {},
  template:
    '<!doctype html><html lang="ne"><head><!--helmet-title--><!--helmet-meta--></head>' +
    '<body><div id="root"><!--app-html--></div><!--dehydrated-state--></body></html>',
};
