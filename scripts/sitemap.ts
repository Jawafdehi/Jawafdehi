import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CANONICAL = 'https://jawafdehi.org';
const API_BASE = 'https://portal.jawafdehi.org/api';

interface CaseSummary {
  id: number;
  updated_at: string;
  entities: Array<{ nes_id: string | null }>;
}

interface PaginatedCaseList {
  next: string | null;
  results: CaseSummary[];
}

const STATIC_ROUTES = ['/', '/about', '/cases', '/entities', '/updates', '/information', '/feedback', '/report'];

function toYMD(isoDate: string): string {
  return isoDate.substring(0, 10);
}

function buildDate(): string {
  return toYMD(new Date().toISOString());
}

function urlEntry(loc: string, lastmod: string): string {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
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

  const entityIds = [...new Set(
    cases.flatMap(c => c.entities.map(e => e.nes_id).filter((id): id is string => id != null))
  )];

  const entries: string[] = [
    ...STATIC_ROUTES.map(r => urlEntry(`${CANONICAL}${r}`, today)),
    ...cases.map(c => urlEntry(`${CANONICAL}/case/${c.id}`, toYMD(c.updated_at))),
    ...entityIds.map(id => urlEntry(`${CANONICAL}/entity/${id}`, today)),
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
