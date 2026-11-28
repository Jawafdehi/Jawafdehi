// SPDX-License-Identifier: Hippocratic-3.0
// The built SSR bundle and HTML template, as the Worker sees them.
//
// Both are build outputs (`vite build --ssr` → dist/server/entry-server.js,
// `vite build` → dist/client/index.html), so this file only resolves after a
// build. That is why it is its own module: wrangler bundles it at deploy time,
// after `bun run build`, while the unit tests replace it with vi.mock and never
// need a dist/ at all.
//
// The template is the RAW one, with the <!--app-html--> / <!--helmet-*-->
// markers still in it. It is never published (dist/.assetsignore keeps
// /client/ off the web), so it has to travel inside the Worker bundle: wrangler
// imports `*.html` as a text module by default.

// @ts-expect-error -- build output; exists only after `vite build --ssr`.
import * as ssrBundle from '../dist/server/entry-server.js';
// @ts-expect-error -- build output; exists only after `vite build`.
import rawTemplate from '../dist/client/index.html';

import type { EdgeBundle } from './edge-render';

export const bundle: EdgeBundle = {
  render: ssrBundle.render,
  setApiTimeout: ssrBundle.setApiTimeout,
  setPrerenderToken: ssrBundle.setPrerenderToken,
  setEdgeSecret: ssrBundle.setEdgeSecret,
  template: rawTemplate as string,
};
