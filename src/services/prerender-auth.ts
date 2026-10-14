// The bearer token the BUILD uses, and nothing else.
//
// `scripts/pre-render.ts` fetches the whole published archive from the platform
// API on every production deploy. Anonymously that competes with real visitors
// for one 1000/hour bucket, and the archive outgrew the cap — so the build now
// authenticates as the `sa-prerender` machine user, which exists purely to land
// in its own throttle scope.
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
