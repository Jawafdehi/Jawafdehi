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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
    }
  };
  dehydratedState: unknown;
}

interface PaginatedCaseList {
  count: number;
  next: string | null;
  results: Array<{
    id: number;
    title?: string | null;
    description?: string | null;
    updated_at: string;
    entities: Array<{ id: number; nes_id: string | null; display_name?: string | null }>;
  }>;
}

const API_BASE = 'https://portal.jawafdehi.org/api';
const CONCURRENCY = 5;

const FETCH_TIMEOUT_MS = 10_000;

async function fetchAllCases(): Promise<PaginatedCaseList['results']> {
  const all: PaginatedCaseList['results'] = [];
  let url: string | null = `${API_BASE}/cases/`;
  while (url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms fetching ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`API error ${res.status} fetching ${url}`);
    const data: PaginatedCaseList = await res.json();
    all.push(...data.results);
    url = data.next;
  }
  return all;
}

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

async function writeHtml(outFile: string, content: string): Promise<void> {
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, content, 'utf-8');
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

function injectIntoTemplate(template: string, result: RenderResult): string {
  const { html, helmetContext, dehydratedState } = result;
  const h = helmetContext.helmet;
  const title = h?.title?.toString() ?? '';
  const meta = [
    h?.meta?.toString() ?? '',
    h?.link?.toString() ?? '',
    h?.script?.toString() ?? '',
    h?.style?.toString() ?? '',
    h?.noscript?.toString() ?? '',
  ].filter(s => s.trim()).join('\n    ');
  const json = JSON.stringify(dehydratedState).replace(/<\//g, '<\\/');
  const stateScript = `<script id="__REACT_QUERY_STATE__" type="application/json">${json}</script>`;

  return template
    .replace('<!--app-html-->', () => html)
    .replace('<!--helmet-title-->', () => title)
    .replace('<!--helmet-meta-->', () => meta)
    .replace('<!--dehydrated-state-->', () => stateScript);
}

function stripHtml(value: string | null | undefined): string {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

function caseToSearchEntry(caseItem: PaginatedCaseList['results'][number], html: string): SearchIndexEntry {
  const title = stripHtml(caseItem.title) || `Case ${caseItem.id}`;
  const description = truncate(stripHtml(caseItem.description), 180);

  return withSearchLines({
    path: `/case/${caseItem.id}`,
    title,
    descriptionKey: description ? undefined : 'searchCommand.descriptions.caseDetail',
    description,
    keywords: ['case', 'corruption', 'archive', String(caseItem.id), title],
    icon: 'FileText',
    group: 'cases',
  }, html);
}

function entityToSearchEntry(entityId: number, name: string | null | undefined, html: string): SearchIndexEntry {
  const title = stripHtml(name) || `Entity ${entityId}`;

  return withSearchLines({
    path: `/entity/${entityId}`,
    title,
    descriptionKey: 'searchCommand.descriptions.entityDetail',
    keywords: ['entity', 'person', 'organization', 'official', String(entityId), title],
    icon: 'Building2',
    group: 'entities',
  }, html);
}

async function main() {
  // Copy client assets (JS/CSS/etc.) from dist/client/ into dist/ so they're
  // reachable at the same absolute paths referenced in index.html (e.g. /assets/index-[hash].js)
  await cp(join(ROOT, 'dist/client'), join(ROOT, 'dist'), { recursive: true });
  console.log('[pre-render] Copied dist/client → dist/');

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
  const { render } = await import('../dist/server/entry-server.js') as {
    render: (url: string) => Promise<RenderResult>;
  };

  const staticRoutes: RouteConfig[] = PRE_RENDERED_STATIC_ROUTES.map((route) => ({
    path: route.path,
    outFile: staticRouteOutFile(route.path),
  }));
  const searchEntries: SearchIndexEntry[] = [];

  // Fetch cases and entity IDs
  let cases: PaginatedCaseList['results'] = [];
  let apiReachable = true;
  try {
    cases = await fetchAllCases();
    console.log(`[pre-render] Fetched ${cases.length} cases`);
  } catch (err) {
    console.warn('[pre-render] WARNING: API unreachable, rendering static routes only:', err);
    apiReachable = false;
  }

  // Collect unique entity IDs — use numeric JDS entity IDs for /entity/:id routes
  const entityIds = apiReachable
    ? [...new Set(
        cases
          .flatMap(c => c.entities.map(e => e.id).filter((id): id is number => id != null))
      )]
    : [];

  // Render static routes
  for (const route of staticRoutes) {
    try {
      const result = await render(route.path);
      const html = injectIntoTemplate(template, result);
      await writeHtml(route.outFile, html);
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

  // Render update detail routes (static data — IDs are known at build time)
  for (const update of UPDATE_ROUTE_ENTRIES) {
    const path = `/updates/${update.id}`;
    const outFile = join(ROOT, 'dist', 'updates', update.id, 'index.html');
    try {
      const result = await render(path);
      const html = injectIntoTemplate(template, result);
      await writeHtml(outFile, html);
      searchEntries.push(withSearchLines(updateRouteToSearchEntry(update), result.html));
      console.log(`[pre-render] ✓ ${path}`);
    } catch (err) {
      console.warn(`[pre-render] WARNING: Skipping update ${update.id}:`, err);
      if (err instanceof Error) console.error(err.stack);
    }
  }

  if (apiReachable) {
    // Render case routes
    await withConcurrency(cases, CONCURRENCY, async (caseItem) => {
      const caseId = String(caseItem.id);
      const path = `/case/${encodeURIComponent(caseId)}`;
      const outFile = join(ROOT, 'dist', 'case', caseId, 'index.html');
      try {
        const result = await render(path);
        const html = injectIntoTemplate(template, result);
        await writeHtml(outFile, html);
        searchEntries.push(caseToSearchEntry(caseItem, result.html));
        console.log(`[pre-render] ✓ ${path}`);
      } catch (err) {
        console.error(`[pre-render] ERROR rendering ${path}:`, err);
        if (err instanceof Error) console.error(err.stack);
      }
    });

    const entityNames = new Map<number, string | null | undefined>();
    for (const caseItem of cases) {
      for (const entity of caseItem.entities) {
        if (!entityNames.has(entity.id)) {
          entityNames.set(entity.id, entity.display_name);
        }
      }
    }

    // Render entity routes
    await withConcurrency(entityIds, CONCURRENCY, async (entityId) => {
      const path = `/entity/${entityId}`;
      const outFile = join(ROOT, 'dist', 'entity', String(entityId), 'index.html');
      try {
        const result = await render(path);
        const html = injectIntoTemplate(template, result);
        await writeHtml(outFile, html);
        searchEntries.push(entityToSearchEntry(entityId, entityNames.get(entityId), result.html));
        console.log(`[pre-render] ✓ ${path}`);
      } catch (err) {
        console.warn(`[pre-render] WARNING: Skipping entity ${entityId}:`, err);
        if (err instanceof Error) console.error(err.stack);
      }
    });
  } else {
    console.log('[pre-render] Skipping case and entity routes (API unreachable)');
  }

  await writeSearchIndex(searchEntries);
  console.log('[pre-render] Done.');
}

main().catch((err) => {
  console.error('[pre-render] Fatal error:', err);
  process.exit(1);
});
