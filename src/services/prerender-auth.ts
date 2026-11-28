// The bearer token the BUILD uses, and nothing else.
//
// `scripts/pre-render.ts` calls the platform API a few hundred times on every
// deploy. Anonymously that competes with real visitors for one 1000/hour
// bucket — so a production build authenticates as the `sa-prerender` machine
// user, which exists purely to land in its own throttle scope.
//
// WHY THIS MODULE EXISTS RATHER THAN AN ENV READ IN `oidc.ts`:
// `pre-render.ts` imports the COMPILED `dist/server/entry-server.js`, which
// bundles its own copy of the axios client. Anything reached by importing the
// TypeScript source from the script is a DIFFERENT module instance and silently
// has no effect on the requests that actually go out. So the token has to be
// pushed in through the compiled bundle's own export surface — `entry-server.tsx`
// re-exports `setPrerenderToken`, and `pre-render.ts` calls it on the module
// object it just imported.
//
// ⚠️ NEVER read a `VITE_`-prefixed variable for this. Vite inlines those into
// the CLIENT bundle at build time, which would ship the credential to every
// visitor's browser. The secret is read from `process.env` in `pre-render.ts`
// (Node side, never bundled) and handed here.
//
// ⚠️ The token must belong to a principal with NO content role. See
// `getAccessToken` in `oidc.ts` for the invariant this is allowed to bend and
// the one it must not.

let token: string | null = null;

/** Install the build's bearer token. Called once per build, before `render()`. */
export function setPrerenderToken(value: string | null): void {
  token = value && value.trim() ? value.trim() : null;
}

/** The build's bearer token, or null when running anonymously. */
export function getPrerenderToken(): string | null {
  return token;
}

// The edge SSR Worker's shared secret for the API's own throttle bucket
// (JawafdehiAPI `edge` scope, header `X-Jawafdehi-Edge-Secret`). Every visitor
// and crawler render reaches the API from Cloudflare's one Worker egress
// address; without this the Worker shares a per-address cap with every other
// Worker on Cloudflare. Set per render by worker/edge-render.ts from the
// Worker's `EDGE_SSR_API_SECRET` secret, never in the client bundle (a browser
// never calls the setter, and http.ts only sends it when there is no window).
let edgeSecret: string | null = null;

/** Install the SSR Worker's throttle secret. Called per render, before `render()`. */
export function setEdgeSecret(value: string | null): void {
  edgeSecret = value && value.trim() ? value.trim() : null;
}

/** The SSR Worker's throttle secret, or null (the build, a browser, dev). */
export function getEdgeSecret(): string | null {
  return edgeSecret;
}
