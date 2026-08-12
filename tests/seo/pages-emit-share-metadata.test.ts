import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import { SITE_ROUTES } from '../../src/data/site-routes';

// #304 turned the share-metadata tag list into one <Seo> component and converted
// 19 pages onto it. Four public routes were missed — /search, /materials,
// /courtcases and /research/corruption-accountability — and nothing noticed,
// because a page with no og: tags looks completely healthy: it has a title, it
// renders, the build is green. The only symptom is a share that arrives as a
// bare blue link.
//
// ROUTE_ELEMENTS being a total Record over SITE_ROUTES guarantees every route
// HAS an element. It says nothing about what that element puts in the head. So
// this walks the same table and checks each public route reaches <Seo>, directly
// or through the page it delegates to. New public routes are covered
// automatically; the ones still unconverted are listed in AWAITING_SEO below,
// which is the remaining work rather than a permission slip.

const SRC = resolve(process.cwd(), 'src');
const ROUTES_TSX = readFileSync(resolve(SRC, 'routes.tsx'), 'utf8');

// Paths whose content is not public, so share metadata would be meaningless.
// Every one is also Disallow'd in public/robots.txt — keep the two in step: a
// path that is crawlable needs share metadata.
const NOT_PUBLIC = ['/admin/*', '/portal/*', '/embed/case/:id', '/document-viewer', '/updates/preview'];

// Elements that are not pages: redirects and layout wrappers. Named explicitly
// so an unresolvable component is a failure rather than a silent skip.
const NOT_A_PAGE = ['Navigate', 'PortalRedirect', 'ClientOnly'];

/** `"path": <Component …>` from the ROUTE_ELEMENTS literal in src/routes.tsx. */
function routeElements(): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of ROUTES_TSX.matchAll(/^\s*"([^"]+)":\s*\(?\s*<(\w+)/gm)) {
    found.set(match[1], match[2]);
  }
  return found;
}

/** `import Name from "…"` and `const Name = lazy(() => import("…"))`. */
function importedModules(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of source.matchAll(/import\s+(\w+)\s+from\s+["']([^"']+)["']/g)) {
    map.set(m[1], m[2]);
  }
  for (const m of source.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(["']([^"']+)["']\)\)/g)) {
    map.set(m[1], m[2]);
  }
  return map;
}

/** Resolve an import specifier from a file inside src/ to a .tsx path, if any. */
function resolveModule(specifier: string, fromDir: string): string | null {
  const base = specifier.startsWith('@/')
    ? resolve(SRC, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(fromDir, specifier)
      : null;
  if (!base) return null;
  const candidate = `${base}.tsx`;
  return existsSync(candidate) ? candidate : null;
}

/**
 * Does this component render <Seo>, itself or via a component it delegates the
 * whole page to? Materials and CourtCases are thin wrappers around ArchiveSearch
 * and hold no metadata of their own, which is correct — one page's metadata
 * should live in one place.
 */
function reachesSeo(file: string, depth = 0): boolean {
  const source = readFileSync(file, 'utf8');
  if (/<Seo[\s/>]/.test(source)) return true;
  if (depth >= 2) return false;

  const dir = resolve(file, '..');
  for (const [name, specifier] of importedModules(source)) {
    if (!new RegExp(`<${name}[\\s/>]`).test(source)) continue;
    const target = resolveModule(specifier, dir);
    if (target && reachesSeo(target, depth + 1)) return true;
  }
  return false;
}

// Public pages that still emit no og: tags. Shrinking this list is the follow-up
// work; each entry says what it needs, because "add <Seo>" is not the whole job
// for a record page that has to describe the record.
const AWAITING_SEO: Record<string, string> = {
  DataQuality: 'public page, needs a card and a description of its own',
  EntityRecordProfile: 'per-record metadata — the entity name, type and image',
  MaterialProfile: 'per-record metadata — the document title and source',
  CourtCaseProfile: 'per-record metadata — the case number, court and parties',
  PaymentSuccess: 'transactional; pre-rendered, so it needs noindex not a card',
  PaymentCancelled: 'transactional; pre-rendered, so it needs noindex not a card',
  NewsletterConfirmed: 'transactional, should be noindex',
  NewsletterUnsubscribe: 'transactional, should be noindex',
};

describe('every public route reaches <Seo>', () => {
  const elements = routeElements();
  const imports = importedModules(ROUTES_TSX);
  const publicPaths = SITE_ROUTES.map((route) => route.path)
    .filter((path) => !NOT_PUBLIC.includes(path))
    .filter((path) => !NOT_A_PAGE.includes(elements.get(path) ?? ''));

  it('parses routes.tsx well enough for the assertions below to mean anything', () => {
    // Without this, a refactor that broke the regexes would make the whole suite
    // pass by finding nothing to check.
    expect(elements.size).toBeGreaterThan(25);
    expect(publicPaths.length).toBeGreaterThan(20);
    // Every path in the table must have been found in ROUTE_ELEMENTS. The Record
    // is total at compile time, so a miss here means the parse is wrong.
    const unparsed = SITE_ROUTES.map((r) => r.path).filter((p) => !elements.has(p));
    expect(unparsed, 'ROUTE_ELEMENTS parse missed these paths').toEqual([]);
  });

  it('resolves every public route element to a file', () => {
    const unresolved = publicPaths.filter((path) => {
      const component = elements.get(path)!;
      const specifier = imports.get(component);
      return !specifier || !resolveModule(specifier, SRC);
    });
    expect(unresolved, 'add these to NOT_A_PAGE if they are not pages').toEqual([]);
  });

  const cases = publicPaths.filter((path) => !(elements.get(path)! in AWAITING_SEO));

  it.each(cases)('%s emits share metadata', (path) => {
    const component = elements.get(path)!;
    const file = resolveModule(imports.get(component)!, SRC)!;
    expect(
      reachesSeo(file),
      `${path} renders <${component} />, which never reaches <Seo>. A page ` +
        `without it has a title but no og: tags, so a share of ${path} arrives ` +
        `as a bare link. Use <Seo> from @/components/Seo — or, if this page ` +
        `genuinely should not be shared, add it to AWAITING_SEO with a reason.`,
    ).toBe(true);
  });

  it('has no stale entry in AWAITING_SEO', () => {
    // Once a page is converted its entry must go, or the list stops meaning
    // anything and the next regression hides behind it.
    const mounted = new Set(publicPaths.map((path) => elements.get(path)!));
    const converted = Object.keys(AWAITING_SEO).filter((component) => {
      if (!mounted.has(component)) return false;
      const specifier = imports.get(component);
      const file = specifier ? resolveModule(specifier, SRC) : null;
      return file ? reachesSeo(file) : false;
    });
    expect(
      converted,
      'these now emit share metadata — remove them from AWAITING_SEO',
    ).toEqual([]);
  });

  it('lists nothing in AWAITING_SEO that is no longer routed', () => {
    const mounted = new Set(publicPaths.map((path) => elements.get(path)!));
    const orphans = Object.keys(AWAITING_SEO).filter((c) => !mounted.has(c));
    expect(orphans, 'these are not public routes any more — drop them').toEqual([]);
  });
});
