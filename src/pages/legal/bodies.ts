import { lazy, type ComponentType } from "react";

/**
 * The legal texts, kept off the critical path.
 *
 * The Privacy Policy and Terms are pre-rendered routes, and a pre-rendered
 * route must be eager (src/routes.tsx: renderToString does not wait for
 * React.lazy). But the four texts together are ~14 KB gzip, which would sit in
 * every visitor's initial JS (scripts/bundle-budget.mjs) to serve two pages
 * few people open.
 *
 * So the client loads them lazily, and the server build is handed the eager
 * versions: src/entry-server.tsx calls registerEagerLegalBodies() with the
 * statically imported texts from ./eager-bodies, a module the client never
 * imports. LegalPage shows the pre-rendered HTML while the client chunk loads,
 * so a first visit to /privacy or /terms does not flash empty.
 */
export type LegalBodyName = "PrivacyEn" | "PrivacyNe" | "TermsEn" | "TermsNe";
type Bodies = Record<LegalBodyName, ComponentType>;

const lazyBodies: Bodies = {
  PrivacyEn: lazy(() => import("./PrivacyEn").then((m) => ({ default: m.PrivacyEn }))),
  PrivacyNe: lazy(() => import("./PrivacyNe").then((m) => ({ default: m.PrivacyNe }))),
  TermsEn: lazy(() => import("./TermsEn").then((m) => ({ default: m.TermsEn }))),
  TermsNe: lazy(() => import("./TermsNe").then((m) => ({ default: m.TermsNe }))),
};

let eagerBodies: Partial<Bodies> = {};

export function registerEagerLegalBodies(bodies: Bodies) {
  eagerBodies = bodies;
}

export function legalBody(name: LegalBodyName): ComponentType {
  return eagerBodies[name] ?? lazyBodies[name];
}
