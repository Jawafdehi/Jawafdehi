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
 * Every `<tag ...>` of one kind, with its attributes parsed: any order, double,
 * single or no quotes, names lower-cased. A crawler accepts all of these, so a
 * check that only accepted one spelling would raise a false outage the day a
 * serializer changed its quoting.
 */
export function tagAttributes(html: string, tag: string): Record<string, string>[] {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, "gi")) ?? [];
  return tags.map((t) => {
    const attrs: Record<string, string> = {};
    for (const m of t.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
    }
    return attrs;
  });
}

/**
 * The verdict on one page's HTML. Every check is something the 2026-11-20
 * outage failed: it shipped an empty <title>, no meta description, no canonical
 * and CaseDetail's `aria-busy` skeleton, with a body of chrome only.
 */
/** An absolute URL compared the way a canonical should be: scheme, host and path, trailing slash ignored. */
function comparableUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return null;
  }
}

/**
 * A Cloudflare interstitial instead of the page. We fetch with Googlebot's
 * user-agent from a GitHub runner, and Cloudflare can tell that is not Google:
 * if it challenges the request, what we measured is the challenge, not what
 * Google is served. Reported as its own problem so it is never read as an outage.
 */
export function isCloudflareChallenge(html: string): boolean {
  return (
    /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(html) ||
    /challenges\.cloudflare\.com|\/cdn-cgi\/challenge-platform\//i.test(html)
  );
}

export function checkHead(html: string, minBodyChars = 2500, requestedUrl?: string): HeadVerdict {
  const problems: string[] = [];
  if (isCloudflareChallenge(html)) {
    return {
      ok: false,
      problems: ["Cloudflare challenge served to our fake Googlebot — not a measurement of what Google gets"],
      title: "",
    };
  }

  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").trim();
  if (!title) problems.push("empty or missing <title>");

  const canonicals = tagAttributes(html, "link").filter(
    (a) =>
      (a.rel ?? "").toLowerCase().split(/\s+/).includes("canonical") &&
      /^https?:\/\/\S+$/i.test(a.href ?? ""),
  );
  if (!canonicals.length) problems.push("no rel=canonical");
  // A page that names ANOTHER URL as canonical is, to a search engine, a copy of
  // that URL. On 2026-11-24 a case URL was served the pre-rendered homepage —
  // a title, a description, a canonical and a long body, so it passed every
  // check above — with canonical=/. The record a sitemap lists must name itself.
  if (requestedUrl && canonicals.length) {
    const want = comparableUrl(requestedUrl);
    const got = canonicals.map((a) => a.href ?? "");
    if (!got.some((href) => comparableUrl(href) === want)) {
      problems.push(`canonical is ${got.join(", ")}, not this page (${requestedUrl})`);
    }
  }
  const description = tagAttributes(html, "meta").some(
    (a) => (a.name ?? "").toLowerCase() === "description" && (a.content ?? "").trim() !== "",
  );
  if (!description) problems.push("empty or missing meta description");
  if (/aria-busy="true"/i.test(html)) {
    problems.push('loading skeleton (aria-busy="true") in the served HTML');
  }
  const chars = bodyTextLength(html);
  if (chars < minBodyChars) {
    problems.push(`body is ${chars} chars of text (< ${minBodyChars}): chrome only?`);
  }

  return { ok: problems.length === 0, problems, title };
}

/**
 * The verdict on one fetched sitemap URL. A sitemap must list FINAL URLs, so a
 * redirect is itself a finding — and following it would let whatever page
 * answered (a homepage, a fallback) pass for the record that did not.
 */
export function pageVerdict(
  status: number,
  html: string,
  location: string | null,
  minBodyChars: number,
  requestedUrl?: string,
): HeadVerdict {
  if (isCloudflareChallenge(html)) return checkHead(html, minBodyChars, requestedUrl);
  if (status === 200) return checkHead(html, minBodyChars, requestedUrl);
  if (status >= 300 && status < 400) {
    return {
      ok: false,
      problems: [`HTTP ${status} redirect to ${location ?? "?"} — a sitemap must list the final URL`],
      title: "",
    };
  }
  return { ok: false, problems: [`HTTP ${status}`], title: "" };
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

interface Fetched {
  status: number;
  text: string;
  location: string | null;
}

async function fetchText(url: string, attempts = 3): Promise<Fetched> {
  let last: Fetched = { status: 0, text: "", location: null };
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": GOOGLEBOT },
        signal: AbortSignal.timeout(45_000),
        // Not followed: see pageVerdict.
        redirect: "manual",
      });
      last = { status: res.status, text: await res.text(), location: res.headers.get("location") };
      // A sitemap child can 503 on a cold API cache and answer on retry; a
      // crawler retries too. Only a persistent failure is a finding.
      if (res.status < 500) return last;
    } catch (err) {
      last = { status: 0, text: String(err), location: null };
    }
    await new Promise((r) => setTimeout(r, 5_000 * (i + 1)));
  }
  return last;
}

async function main(): Promise<number> {
  const base = (process.argv[2] || "https://jawafdehi.org").replace(/\/+$/, "");
  const perType = Number(process.argv[3] || 8);
  // "0", "-1" or "eight" would sample no pages and report success having
  // checked nothing. A check that cannot fail is worse than none.
  if (!Number.isSafeInteger(perType) || perType < 1) {
    console.error(`samples-per-type must be a positive integer, got ${JSON.stringify(process.argv[3])}`);
    return 2;
  }
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
      const verdict = pageVerdict(page.status, page.text, page.location, minBodyChars, url);
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
