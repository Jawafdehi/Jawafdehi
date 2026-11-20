process.env.SSR = 'true';

import { readFile, writeFile, mkdir, cp } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  PRE_RENDERED_STATIC_ROUTES,
  UPDATE_ROUTE_ENTRIES,
  shouldIncludeStaticRouteInSearch,
  staticRouteToSearchEntry,
  updateRouteToSearchEntry,
  type SearchIndexEntry,
  type SearchIndexFile,
  type SearchIndexLine,
} from '../src/data/site-routes.ts';
import {
  summarisePrefetchFailures,
  type PrefetchReport,
  type RoutePrefetchFailure,
} from '../src/lib/ssr-prefetch.ts';
import { WHATS_NEW, whatsNewPostPath } from '../src/data/whats-new.ts';
import { buildAuthHeaders, buildAuthToken, hasBuildCredentials } from './build-auth.ts';
import { fetchWithRetry } from './build-fetch.ts';
import { injectIntoTemplate } from '../src/lib/ssr-template.ts';

// What this script renders: the fixed top-level routes, the product-update posts
// and the update articles — a few hundred pages, whatever the size of the
// archive. Record pages (/case/*, /entity/*, /material/*, /courtcase/*) are NOT
// rendered here: the Worker renders them on request and caches them (see the
// "Edge SSR" section of worker.ts). It used to pre-render every case and up to
// 10,000 entities, which meant walking the whole case archive on every build,
// thousands of upstream calls, and a dist/ that crept toward Cloudflare's
// 20,000-file ceiling. The /cases browse pages main renders are gone on this
// branch: /cases redirects into /search.

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Break glass to build without the API: pre-rendered pages then ship an empty
// React Query cache, which is fine for a local `bun run build` and never fine for
// anything a visitor or a crawler will see. Not set in CI, deliberately.
const ALLOW_EMPTY_PREFETCH = process.env.PRERENDER_ALLOW_EMPTY_PREFETCH === '1';

// `full` | `static`. Both now render exactly the same set of pages: the only
// thing that told them apart was the case and entity pre-render, which is gone.
// Still accepted and still validated, because `build:preview` sets `static` and
// deploy-production.yml leaves it at the default, and a typo here should keep
// failing loudly rather than be silently ignored.
const SCOPE = process.env.PRERENDER_SCOPE ?? 'full';
if (SCOPE !== 'full' && SCOPE !== 'static') {
  console.error(
    `[pre-render] ERROR: PRERENDER_SCOPE must be "full" or "static", got ${JSON.stringify(SCOPE)}.`,
  );
  process.exit(1);
}

interface RouteConfig {
  path: string;
  outFile: string;
}

interface RenderResult {
  html: string;
  helmetContext: {
    helmet?: {
      title?: { toString(): string };
      meta?: { toString(): string };
      link?: { toString(): string };
      script?: { toString(): string };
      style?: { toString(): string };
      noscript?: { toString(): string };
      htmlAttributes?: { toString(): string };
    }
  };
  dehydratedState: unknown;
  prefetch: PrefetchReport;
}

const API_BASE = 'https://api.jawafdehi.org/api';
const CONCURRENCY = 5;

async function withConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// renderToString does not throw when it hits an unresolved Suspense boundary — it
// returns the fallback and a <template data-msg="The server did not finish this
// Suspense boundary..."> marker, and the build happily writes that to disk and
// exits 0. That is how /donate shipped blank in August and how /entity/* shipped
// 1,544 empty-titled stubs in this branch, both past a green CI.
//
// So assert on the OUTPUT rather than on a list of routes that must stay eager.
// A list has to be kept in step with this file by hand and silently stops
// covering whatever someone adds next; this cannot drift, because it reads what
// was actually produced. tests/ssr/prerendered-routes-eager.test.ts still checks
// the same rule at unit-test speed — this is the backstop for the case the test
// cannot see.
const SUSPENSE_STUB_MARKER = 'did not finish this Suspense boundary';

// Its own type because the per-route loops below are deliberately tolerant — one
// unrenderable update warns and is skipped rather than failing a deploy. A lazy
// page is the opposite kind of problem: it fails EVERY route in that family
// identically, so "skip and carry on" would quietly publish a site with the
// whole family missing. Those loops rethrow this one.
class SuspenseStubError extends Error {
  override readonly name = 'SuspenseStubError';
}

async function writeHtml(outFile: string, content: string): Promise<void> {
  if (content.includes(SUSPENSE_STUB_MARKER)) {
    throw new SuspenseStubError(
      `refusing to write ${outFile}: it pre-rendered as a Suspense fallback, not a page. ` +
        `The route's page component is lazy() and every pre-rendered route must be an ` +
        `eager import — see the split policy in src/routes.tsx.`,
    );
  }
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, content, 'utf-8');
}

/**
 * Write `dist/.assetsignore`, so wrangler does not publish the build's own
 * intermediates.
 *
 * `wrangler.toml` sets `[assets] directory = "./dist"`, which is the PARENT of
 * vite's two outDirs — `dist/client` (client bundle) and `dist/server` (SSR
 * bundle). Nobody chose to publish those; the publish boundary is just one level
 * above them. Until this existed, production served
 * `/server/entry-server.js` (1.4 MB, the SSR bundle) and
 * `/client/search-index.json` (7.9 MB, a byte-identical duplicate of
 * `/search-index.json`) to anyone who asked, and spent 250 of Cloudflare's
 * 20,000 static-asset slots per version doing it — measured 2026-10-21 against
 * a real build: 385 files in `dist/`, of which 135 are publishable.
 *
 * ⚠️ Ignore them, do NOT delete them. Both directories are inputs to this very
 * build — `dist/server/entry-server.js` is imported below and the HTML template
 * is read from `dist/client/index.html` — and `dist/client` is also what
 * `vite preview` serves locally. `.assetsignore` keeps them on disk and off the
 * web, which is the distinction that matters.
 *
 * Note what "off the web" means here. An ignored path is one the assets binding
 * does not hold, so `env.ASSETS.fetch` 404s and worker.ts falls through to its
 * SPA fallback — which serves the shell BODY but sets the status from whether
 * the path matches a known SPA route (`status = matched && !outOfRangeCasePage
 * ? 200 : 404`). `/client/*` and `/server/*` match nothing, so they answer
 * **404 with an HTML body**, and React Router renders the styled NotFound page.
 *
 * Verified in production 2026-10-21, the first build after this landed:
 * `/server/entry-server.js` and `/client/search-index.json` both went from
 * 200 + their real payload to 404 + the 292 KB shell, while
 * `/search-index.json` kept serving its 7.9 MB for real.
 *
 * Written here rather than committed because `dist/` is regenerated every build.
 * The file lists itself: wrangler's self-exclusion is undocumented, so it is
 * excluded explicitly rather than assumed.
 */
async function writeAssetsIgnore(): Promise<void> {
  const lines = [
    '# Generated by scripts/pre-render.ts — do not edit by hand.',
    '# Build intermediates: needed on disk during the build, never published.',
    '/client/',
    '/server/',
    '.assetsignore',
    '',
  ].join('\n');
  await writeFile(join(ROOT, 'dist/.assetsignore'), lines, 'utf-8');
  console.log('[pre-render] Wrote dist/.assetsignore (excludes /client/, /server/)');
}

async function writeSearchIndex(entries: SearchIndexEntry[]): Promise<void> {
  const index: SearchIndexFile = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  };
  const content = `${JSON.stringify(index, null, 2)}\n`;

  const outFiles = [
    join(ROOT, 'dist/search-index.json'),
    join(ROOT, 'dist/client/search-index.json'),
  ];

  for (const outFile of outFiles) {
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, content, 'utf-8');
  }

  console.log(`[pre-render] Wrote search index (${entries.length} entries)`);
}

function staticRouteOutFile(path: string): string {
  if (path === '/') {
    return join(ROOT, 'dist/index.html');
  }

  return join(ROOT, 'dist', path.replace(/^\//, ''), 'index.html');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return namedEntities[normalized] ?? match;
  });
}

function getTagId(attributes: string): string | undefined {
  const match = /\sid=(["'])(.*?)\1/i.exec(attributes);
  return match?.[2];
}

function htmlToSearchLineText(html: string): string[] {
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(br|hr)\b[^>]*>/gi, '\n')
    .replace(/<\/(?:address|article|aside|blockquote|dd|div|dl|dt|figcaption|figure|footer|form|h[1-6]|header|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');

  return decodeHtmlEntities(visibleText)
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 1);
}

function extractSearchLines(html: string): SearchIndexLine[] {
  const lines: SearchIndexLine[] = [];
  const sectionPattern = /<(section|article|h[1-6])\b([^>]*)>/gi;
  let currentSectionId: string | undefined;
  let cursor = 0;

  const appendLines = (chunk: string) => {
    for (const text of htmlToSearchLineText(chunk)) {
      lines.push({
        line: lines.length + 1,
        text: truncate(text, 240),
        sectionId: currentSectionId,
      });
    }
  };

  for (let match = sectionPattern.exec(html); match; match = sectionPattern.exec(html)) {
    appendLines(html.slice(cursor, match.index));
    currentSectionId = getTagId(match[2]) ?? currentSectionId;
    cursor = sectionPattern.lastIndex;
  }

  appendLines(html.slice(cursor));

  return lines;
}

function withSearchLines(entry: SearchIndexEntry, html: string): SearchIndexEntry {
  return {
    ...entry,
    lines: extractSearchLines(html),
  };
}

async function main() {
  // Credentials are optional. A build now makes a few hundred calls — one
  // search per case browse page (~220) plus the static routes' prefetches —
  // which fits under the 1000/hour anonymous cap even with the CI check and the
  // Cloudflare preview build running on the same push. Production still sets
  // PRERENDER_CLIENT_ID/SECRET, so it keeps its own throttle bucket rather than
  // competing with readers; their absence is worth a warning, not a failed
  // build. (The old hard requirement, and its PRERENDER_ANONYMOUS escape hatch,
  // existed for the full-archive walk, which is gone.)
  if (!hasBuildCredentials()) {
    console.warn(
      '[pre-render] WARNING: no PRERENDER_CLIENT_ID/PRERENDER_CLIENT_SECRET — fetching anonymously.\n' +
        '  Fine for a local or preview build; production should set them (the sa-prerender\n' +
        '  machine user, kv/jawafdehi/private/prerender/creds in OpenBao).',
    );
  }

  // Copy client assets (JS/CSS/etc.) from dist/client/ into dist/ so they're
  // reachable at the same absolute paths referenced in index.html (e.g. /assets/index-[hash].js)
  await cp(join(ROOT, 'dist/client'), join(ROOT, 'dist'), { recursive: true });
  console.log('[pre-render] Copied dist/client → dist/');

  await writeAssetsIgnore();

  // Read template
  const templatePath = join(ROOT, 'dist/client/index.html');
  let template: string;
  try {
    template = await readFile(templatePath, 'utf-8');
  } catch {
    console.error(`[pre-render] ERROR: Template not found at ${templatePath}`);
    process.exit(1);
  }

  // Dynamic import of SSR bundle (built by `vite build --ssr`, not available at type-check time)
  // @ts-expect-error: module only exists after `vite build --ssr`
  const serverEntry = await import('../dist/server/entry-server.js') as {
    render: (url: string) => Promise<RenderResult>;
    setPrerenderToken: (token: string | null) => void;
  };
  const { render } = serverEntry;

  // Install the build's token on THIS module instance. The bundle carries its
  // own copy of the shared axios client, so configuring the TypeScript source
  // from here would reach a different instance and leave every prefetch
  // anonymous — the same aliasing that made an interceptor added here silently
  // do nothing. See src/services/prerender-auth.ts.
  const token = await buildAuthToken();
  serverEntry.setPrerenderToken(token);
  console.log(
    token
      ? '[pre-render] Authenticated as the prerender service account.'
      : '[pre-render] No build credentials — fetching anonymously.',
  );

  const staticRoutes: RouteConfig[] = PRE_RENDERED_STATIC_ROUTES.map((route) => ({
    path: route.path,
    outFile: staticRouteOutFile(route.path),
  }));
  const searchEntries: SearchIndexEntry[] = [];

  // Collected rather than thrown on, so one build reports every broken route
  // instead of dying on the first and hiding the rest. Enforced at the end.
  const prefetchFailures: RoutePrefetchFailure[] = [];
  const notePrefetch = (route: string, result: RenderResult): void => {
    if (result.prefetch.failed.length > 0) {
      prefetchFailures.push({ route, failed: result.prefetch.failed });
    }
  };

  // Is the API reachable? One cheap search call (retried like every build
  // fetch). When it is not, the build fails here — every page that prefetches
  // would ship empty — unless PRERENDER_ALLOW_EMPTY_PREFETCH=1, in which case
  // the static routes are rendered with an empty cache.
  try {
    const probe = await fetchWithRetry(`${API_BASE}/search/?type=case&page_size=1`, {
      headers: await buildAuthHeaders(),
    });
    if (!probe.ok) throw new Error(`API error ${probe.status} probing ${API_BASE}`);
    await probe.body?.cancel().catch(() => {});
  } catch (err) {
    if (!ALLOW_EMPTY_PREFETCH) {
      console.error('[pre-render] ERROR: the API is unreachable, so every pre-rendered page would ship empty:', err);
      console.error('[pre-render] Building with no API access? Set PRERENDER_ALLOW_EMPTY_PREFETCH=1.');
      process.exit(1);
    }
    console.warn('[pre-render] WARNING: API unreachable, rendering static routes only:', err);
  }

  // Render static routes
  for (const route of staticRoutes) {
    try {
      const result = await render(route.path);
      const html = injectIntoTemplate(template, result);
      await writeHtml(route.outFile, html);
      notePrefetch(route.path, result);
      const routeConfig = PRE_RENDERED_STATIC_ROUTES.find((item) => item.path === route.path);
      if (routeConfig && shouldIncludeStaticRouteInSearch(routeConfig)) {
        searchEntries.push(withSearchLines(staticRouteToSearchEntry(routeConfig), result.html));
      }
      console.log(`[pre-render] ✓ ${route.path} → ${route.outFile}`);
    } catch (err) {
      console.error(`[pre-render] ERROR rendering ${route.path}:`, err);
      if (err instanceof Error) console.error(err.stack);
      process.exit(1);
    }
  }

  // One post per changelog entry (src/data/whats-new.ts). Static data, so every
  // entry is known at build time. A failure fails the build like a static route.
  for (const entry of WHATS_NEW) {
    const path = whatsNewPostPath(entry.id);
    const outFile = join(ROOT, 'dist', path.slice(1), 'index.html');
    try {
      const result = await render(path);
      await writeHtml(outFile, injectIntoTemplate(template, result));
      notePrefetch(path, result);
      console.log(`[pre-render] ✓ ${path}`);
    } catch (err) {
      console.error(`[pre-render] ERROR rendering ${path}:`, err);
      if (err instanceof Error) console.error(err.stack);
      process.exit(1);
    }
  }

  // Render update detail routes (static data — IDs are known at build time)
  for (const update of UPDATE_ROUTE_ENTRIES) {
    const path = `/updates/${update.id}`;
    const outFile = join(ROOT, 'dist', 'updates', update.id, 'index.html');
    try {
      const result = await render(path);
      const html = injectIntoTemplate(template, result);
      await writeHtml(outFile, html);
      notePrefetch(path, result);
      searchEntries.push(withSearchLines(updateRouteToSearchEntry(update), result.html));
      console.log(`[pre-render] ✓ ${path}`);
    } catch (err) {
      if (err instanceof SuspenseStubError) throw err;
      console.warn(`[pre-render] WARNING: Skipping update ${update.id}:`, err);
      if (err instanceof Error) console.error(err.stack);
    }
  }

  // Static routes and updates only. Cases are searched live from the API by the
  // command palette (src/components/AppSearchCommand.tsx), so the index no
  // longer needs the archive walk that used to fill it.
  await writeSearchIndex(searchEntries);

  if (prefetchFailures.length > 0) {
    const summary = summarisePrefetchFailures(prefetchFailures);
    if (ALLOW_EMPTY_PREFETCH) {
      console.warn(`[pre-render] WARNING (PRERENDER_ALLOW_EMPTY_PREFETCH=1): ${summary}`);
    } else {
      console.error(`[pre-render] ERROR: ${summary}`);
      console.error(
        '[pre-render] Those pages were written with an empty React Query cache, so they\n' +
        '  serve a skeleton to crawlers and on first paint. Refusing to publish them.\n' +
        '  Building with no API access? Set PRERENDER_ALLOW_EMPTY_PREFETCH=1.',
      );
      process.exit(1);
    }
  }

  console.log('[pre-render] Done.');
}

main().catch((err) => {
  console.error('[pre-render] Fatal error:', err);
  process.exit(1);
});
