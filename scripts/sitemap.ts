import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PRE_RENDERED_STATIC_ROUTES, UPDATE_ROUTE_ENTRIES } from '../src/data/site-routes.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CANONICAL = 'https://jawafdehi.org';
const API_BASE = 'https://api.jawafdehi.org/api';

interface EntitySummary {
  id: number;
  nes_id: string | null;
  display_name: string | null;
}

interface CaseSummary {
  id: number;
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
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data: PaginatedCaseList = await res.json();
    all.push(...data.results);
    url = data.next;
  }
  return all;
}

async function main() {
  const today = buildDate();

  let cases: CaseSummary[] = [];
  try {
    cases = await fetchAllCases();
    console.log(`[sitemap] Fetched ${cases.length} cases`);
  } catch (err) {
    console.warn('[sitemap] WARNING: API unreachable, generating static-only sitemap:', err);
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
    ...PRE_RENDERED_STATIC_ROUTES.map(r => urlEntry(`${CANONICAL}${r.path}`, today, r.sitemapTitle)),
    ...UPDATE_ROUTE_ENTRIES.map(u => urlEntry(`${CANONICAL}/updates/${u.id}`, today, u.title)),
    ...cases.map(c => urlEntry(`${CANONICAL}/case/${c.id}`, toYMD(c.updated_at), c.title ? `${c.title} — Jawafdehi` : undefined)),
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
