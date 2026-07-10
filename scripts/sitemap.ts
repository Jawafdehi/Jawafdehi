import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  PRE_RENDERED_STATIC_ROUTES,
  shouldIncludeStaticRouteInSitemap,
} from '../src/data/site-routes.ts';
import type { ArticleListItem, WagtailListResponse } from './cms-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CANONICAL = 'https://jawafdehi.org';
const API_BASE = process.env.VITE_JAWAFDEHI_API_BASE_URL || 'https://api.jawafdehi.org/api';
const CMS_BASE = `${API_BASE}/cms/v2`;
const FETCH_TIMEOUT_MS = 10_000;

interface EntitySummary {
  id: number;
  nes_id: string | null;
  display_name: string | null;
}

interface CaseSummary {
  id: number;
  slug?: string | null;
  title: string;
  updated_at: string;
  entities: EntitySummary[];
}

interface PaginatedCaseList {
  next: string | null;
  results: CaseSummary[];
}

function toYMD(isoDate: string): string {
  return isoDate.substring(0, 10);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms fetching ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function buildDate(): string {
  return toYMD(new Date().toISOString());
}

/** Escape XML special characters so titles are safe inside element content. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod: string, title?: string): string {
  const titleLine = title ? `\n    <title>${escapeXml(title)}</title>` : '';
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>${titleLine}\n  </url>`;
}

async function fetchAllCases(): Promise<CaseSummary[]> {
  const all: CaseSummary[] = [];
  let url: string | null = `${API_BASE}/cases/`;
  while (url) {
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data: PaginatedCaseList = await res.json();
    all.push(...data.results);
    url = data.next;
  }
  return all;
}

async function fetchAllArticles(): Promise<ArticleListItem[]> {
  const all: ArticleListItem[] = [];
  const limit = 20;
  let offset = 0;
  let totalCount: number | null = null;

  do {
    const url = new URL(`${CMS_BASE}/pages/`);
    url.searchParams.set('type', 'content.ArticlePage');
    url.searchParams.set('fields', 'title,category,date,excerpt,thumbnail');
    url.searchParams.set('order', '-date');
    url.searchParams.set('limit', String(limit));
    if (offset > 0) {
      url.searchParams.set('offset', String(offset));
    }

    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) throw new Error(`CMS API error ${res.status}`);
    const data: WagtailListResponse<ArticleListItem> = await res.json();
    totalCount = data.meta.total_count;
    all.push(...data.items);

    if (data.items.length === 0) {
      break;
    }
    offset += data.items.length;
  } while (totalCount == null || offset < totalCount);

  return all;
}

async function main() {
  const today = buildDate();

  // A reachable API is a hard requirement: a static-only sitemap that silently
  // omits every case and update would hide entire sections from search engines
  // while the build stays green. Fetch failures abort instead.
  let cases: CaseSummary[] = [];
  try {
    cases = await fetchAllCases();
    console.log(`[sitemap] Fetched ${cases.length} cases`);
  } catch (err) {
    console.error(
      `[sitemap] FATAL: could not fetch cases from ${API_BASE}. ` +
      `Refusing to write a sitemap missing every case. ` +
      `Check the API is reachable and VITE_JAWAFDEHI_API_BASE_URL is correct.`,
      err,
    );
    process.exit(1);
  }

  let articles: ArticleListItem[] = [];
  try {
    articles = await fetchAllArticles();
    console.log(`[sitemap] Fetched ${articles.length} CMS articles`);
  } catch (err) {
    console.error(
      `[sitemap] FATAL: could not fetch CMS articles from ${CMS_BASE}. ` +
      `Refusing to write a sitemap missing every update. ` +
      `Check the CMS API is reachable and VITE_JAWAFDEHI_API_BASE_URL is correct.`,
      err,
    );
    process.exit(1);
  }

  // Build a map of entity id → display_name from all cases
  const entityMap = new Map<number, string | null>();
  for (const c of cases) {
    for (const e of c.entities) {
      if (!entityMap.has(e.id)) {
        entityMap.set(e.id, e.display_name);
      }
    }
  }

  const entityIds = [...new Set(
    cases.flatMap(c => c.entities.map(e => e.id).filter((id): id is number => id != null))
  )];

  const entries: string[] = [
    ...PRE_RENDERED_STATIC_ROUTES
      .filter(shouldIncludeStaticRouteInSitemap)
      .map(r => urlEntry(`${CANONICAL}${r.path}`, today, r.sitemapTitle)),
    ...articles
      .filter(a => a.meta.slug)
      .map(a => urlEntry(
        `${CANONICAL}/updates/${a.meta.slug}`,
        toYMD(a.date || a.meta.first_published_at || new Date().toISOString()),
        a.title ? `${a.title} — Jawafdehi` : undefined,
      )),
    ...cases.map(c => urlEntry(`${CANONICAL}/case/${c.slug || c.id}`, toYMD(c.updated_at), c.title ? `${c.title} — Jawafdehi` : undefined)),
    ...entityIds.map(id => {
      const name = entityMap.get(id);
      return urlEntry(`${CANONICAL}/entity/${id}`, today, name ? `${name} — Jawafdehi` : undefined);
    }),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');

  const outPath = join(ROOT, 'dist/sitemap.xml');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, xml, 'utf-8');
  console.log(`[sitemap] Written to ${outPath} (${entries.length} entries)`);
}

main().catch((err) => {
  console.error('[sitemap] Fatal error:', err);
  process.exit(1);
});
