// SPDX-License-Identifier: Hippocratic-3.0
/**
 * What does a search engine actually get from production? This fetches a sample
 * of record pages AS GOOGLEBOT and fails if any of them would be indexed blank.
 *
 * It exists because of 2026-11-20 → 11-23. A dev-only element added to
 * CaseDetail's query key made every one of 2,847 case pages serve crawlers its
 * loading skeleton: an empty <title>, no description, no canonical, 1,531
 * characters of navbar and footer. Every unit test was green, every build was
 * green, the site looked fine in a browser — and it took three days and a manual
 * curl to notice. Nothing was looking at what a crawler is served.
 *
 * Deliberately black-box: it reads the same sitemaps and the same HTML a
 * crawler does, through Cloudflare, cache and all. A stale bad page in the edge
 * cache is still a bad page.
 *
 *   bun run scripts/crawler-head-check.ts [base-url] [samples-per-type]
 */

export interface HeadVerdict {
  ok: boolean;
  problems: string[];
  title: string;
}

/** Visible text length of the body: no scripts, no tags, whitespace collapsed. */
export function bodyTextLength(html: string): number {
  const body = html.split(/<\/head>/i).slice(1).join(" ") || html;
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/**
 * The verdict on one page's HTML. Every check is something the 2026-11-20
 * outage failed: it shipped an empty <title>, no meta description, no canonical
 * and CaseDetail's `aria-busy` skeleton, with a body of chrome only.
 */
export function checkHead(html: string, minBodyChars = 2500): HeadVerdict {
  const problems: string[] = [];

  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();
  if (!title) problems.push("empty or missing <title>");

  if (!/<link\b[^>]*rel="canonical"[^>]*href="https?:\/\/[^"]+"/i.test(html)) {
    problems.push("no rel=canonical");
  }
  if (!/<meta\b[^>]*name="description"[^>]*content="[^"]+"/i.test(html)) {
    problems.push("empty or missing meta description");
  }
  if (/aria-busy="true"/i.test(html)) {
    problems.push('loading skeleton (aria-busy="true") in the served HTML');
  }
  const chars = bodyTextLength(html);
  if (chars < minBodyChars) {
    problems.push(`body is ${chars} chars of text (< ${minBodyChars}): chrome only?`);
  }

  return { ok: problems.length === 0, problems, title };
}

/** Every <loc> in a sitemap document. */
export function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

/**
 * `n` distinct items, the same ones for the same seed. Seeded by the date so a
 * failure can be re-run against the same URLs, while each day still covers
 * different pages over time.
 */
export function sample<T>(items: readonly T[], n: number, seed: number): T[] {
  const pool = [...items];
  let state = seed >>> 0 || 1;
  const next = () => {
    // xorshift32: small, deterministic, good enough to spread a sample.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const picked: T[] = [];
  while (picked.length < n && pool.length) {
    picked.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
  }
  return picked;
}

const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// The record types whose pages must be indexable, each with the least visible
// body text a healthy page has. Materials are excluded on purpose: every
// document page is `noindex` until document indexability is decided, and is not
// in the sitemap.
//
// Calibrated on production, 2026-11-23, 12 random pages per type: the smallest
// healthy case was 3,769 chars, entity 2,141, court case 2,063 — and the
// outage's chrome-only page was 1,531. Cases get a wide margin; the registry
// pages are genuinely short, so theirs sits between the two. Body length is the
// backstop: the title, canonical, description and skeleton checks are what
// catch an outage first.
const SECTIONS = [
  { name: "case", minBodyChars: 2500 },
  { name: "entity", minBodyChars: 1800 },
  { name: "courtcase", minBodyChars: 1800 },
] as const;

async function fetchText(url: string, attempts = 3): Promise<{ status: number; text: string }> {
  let last: { status: number; text: string } = { status: 0, text: "" };
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": GOOGLEBOT },
        signal: AbortSignal.timeout(45_000),
      });
      last = { status: res.status, text: await res.text() };
      // A sitemap child can 503 on a cold API cache and answer on retry; a
      // crawler retries too. Only a persistent failure is a finding.
      if (res.status < 500) return last;
    } catch (err) {
      last = { status: 0, text: String(err) };
    }
    await new Promise((r) => setTimeout(r, 5_000 * (i + 1)));
  }
  return last;
}

async function main(): Promise<number> {
  const base = (process.argv[2] || "https://jawafdehi.org").replace(/\/+$/, "");
  const perType = Number(process.argv[3] || 8);
  const today = new Date().toISOString().slice(0, 10);
  const seed = Number(today.replace(/-/g, ""));
  console.log(`Crawler-head check: ${base}, ${perType} per type, seed ${seed} (${today})\n`);

  let failures = 0;
  for (const { name: section, minBodyChars } of SECTIONS) {
    const sm = await fetchText(`${base}/sitemap-${section}.xml`);
    const locs = sm.status === 200 ? sitemapLocs(sm.text) : [];
    if (!locs.length) {
      console.log(`✗ sitemap-${section}.xml: HTTP ${sm.status}, ${locs.length} URLs`);
      failures++;
      continue;
    }
    console.log(`sitemap-${section}.xml: ${locs.length} URLs`);
    for (const url of sample(locs, perType, seed)) {
      const page = await fetchText(url);
      const verdict =
        page.status === 200
          ? checkHead(page.text, minBodyChars)
          : { ok: false, problems: [`HTTP ${page.status}`], title: "" };
      if (!verdict.ok) failures++;
      console.log(
        `  ${verdict.ok ? "✓" : "✗"} ${url}${verdict.ok ? "" : `\n      ${verdict.problems.join("; ")}`}`,
      );
    }
  }

  console.log(failures ? `\n${failures} problem(s). Crawlers are being served broken pages.` : "\nAll sampled pages are indexable.");
  return failures ? 1 : 0;
}

// Bun sets import.meta.main for the entry module only, so importing this file
// from the tests does not start a crawl.
if ((import.meta as { main?: boolean }).main) {
  main().then((code) => process.exit(code));
}
