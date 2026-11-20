// The site's OWN pages, as one child sitemap: dist/sitemap-site.xml.
//
// Record pages (cases, entities, materials, court cases) are no longer listed
// here. The API owns that list: its sitemap index (api.jawafdehi.org/sitemap.xml,
// 50k URLs per child file, only published / listed / name-gated records) is what
// the Worker serves at jawafdehi.org/sitemap.xml, with this file added as one
// more <sitemap> entry (see the sitemap section of worker.ts). So this script
// no longer walks the case archive: the CMS article list is all it fetches, and the build stops depending on the
// archive being fast (JAW-80).
import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  PRE_RENDERED_STATIC_ROUTES,
  shouldIncludeStaticRouteInSitemap,
} from '../src/data/site-routes.ts';
import { buildAuthHeaders } from './build-auth.ts';
import { WHATS_NEW, whatsNewPostPath } from '../src/data/whats-new.ts';
import { fetchWithRetry } from './build-fetch.ts';
import type { ArticleListItem, WagtailListResponse } from './cms-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CANONICAL = 'https://jawafdehi.org';
const API_BASE = process.env.VITE_JAWAFDEHI_API_BASE_URL || 'https://api.jawafdehi.org/api';
const CMS_BASE = `${API_BASE}/cms/v2`;

function toYMD(isoDate: string): string {
  return isoDate.substring(0, 10);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  // Authenticated when the build has credentials, so these few calls land in
  // the build's own throttle bucket — see scripts/build-auth.ts.
  //
  // Retried with backoff (scripts/build-fetch.ts): production build 38a68552
  // failed in this script on one 10 s API timeout.
  const headers = await buildAuthHeaders();
  return fetchWithRetry(url, { headers });
}

// <title> is not a valid child of <url> in the sitemaps.org 0.9 schema, so it
// is not emitted. lastmod is optional: omitting it is honest when we have no
// real modification date, whereas stamping every URL with today's date trains
// crawlers to ignore the field.
function urlEntry(loc: string, lastmod?: string): string {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${loc}</loc>${lastmodLine}\n  </url>`;
}

// Prerendered routes are served from <path>/index.html, so the edge 307s the
// slashless form. Advertising the redirecting URL in the sitemap — and in
// rel=canonical — asks crawlers to index a redirect. /updates/* is not
// prerendered and answers 200 without a slash, so it is deliberately left
// alone. Measured against production 2026-08-11: 17 of 90 sitemap URLs were
// 307ing, all of them static routes.
//
// ⚠️ /case/* LEFT that group on 2026-10-02 and this comment is the only warning
// that the two facts are coupled. #415 started pre-rendering case pages, which
// moved every one of them to /case/<slug>/index.html — so all 463 slashless
// sitemap URLs and all 463 slashless rel=canonical values began pointing at a
// 307. Verified against production immediately after that deploy. Whenever a
// route starts being pre-rendered, its sitemap and canonical forms have to move
// with it, or the sitemap advertises redirects for the whole family.
//
// /entity/* followed /case/* out of that group when it was pre-rendered too.
// Neither family is pre-rendered any more (the edge renders them), but both
// stay canonical WITH a slash: worker.ts now 301s the slashless form itself.
function withTrailingSlash(path: string): string {
  return path === '/' || path.endsWith('/') ? path : `${path}/`;
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
  // A reachable CMS is a hard requirement: a sitemap that silently omits every
  // update would hide a whole section from search engines while the build stays
  // green. Fetch failures abort instead.
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


  const entries: string[] = [
    ...PRE_RENDERED_STATIC_ROUTES
      .filter(shouldIncludeStaticRouteInSitemap)
      .map(r => urlEntry(`${CANONICAL}${withTrailingSlash(r.path)}`)),
    ...WHATS_NEW.map(e => urlEntry(`${CANONICAL}${withTrailingSlash(whatsNewPostPath(e.id))}`, e.date)),
    ...articles
      .filter(a => a.meta.slug)
      .map(a => urlEntry(
        `${CANONICAL}/${a.category === 'BLOG' ? 'blog' : 'updates'}/${a.meta.slug}`,
        toYMD(a.date || a.meta.first_published_at || new Date().toISOString()),
      )),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');

  // Not dist/sitemap.xml: a file there would be served by the assets binding
  // ahead of the Worker and hide the API's index (assets answer first).
  const outPath = join(ROOT, 'dist/sitemap-site.xml');
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, xml, 'utf-8');
  console.log(`[sitemap] Written to ${outPath} (${entries.length} entries)`);
}

main().catch((err) => {
  console.error('[sitemap] Fatal error:', err);
  process.exit(1);
});
