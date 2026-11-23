// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";

import { bodyTextLength, checkHead, pageVerdict, sample, sitemapLocs, tagAttributes } from "./crawler-head-check";

const BODY = `<main><h1>नमुना सहकारी प्रकरण</h1><p>${"विवरण ".repeat(600)}</p></main>`;

function page(head: string, body = BODY): string {
  return `<!doctype html><html lang="ne"><head>${head}</head><body>${body}</body></html>`;
}

const GOOD_HEAD =
  '<title data-rh="true">नमुना सहकारी प्रकरण | Jawafdehi</title>' +
  '<meta data-rh="true" name="description" content="नमुना विवरण।"/>' +
  '<link data-rh="true" rel="canonical" href="https://jawafdehi.org/case/namuna/"/>';

describe("checkHead", () => {
  it("passes a page a crawler can index", () => {
    expect(checkHead(page(GOOD_HEAD))).toMatchObject({ ok: true, problems: [] });
  });

  it("fails the 2026-11-20 outage page on every count it got wrong", () => {
    // What every case page served for three days: helmet's empty title, no
    // description or canonical, CaseDetail's skeleton, and only chrome.
    const outage = page(
      '<title data-rh="true"></title>',
      '<nav>गृहपृष्ठ अभिलेख</nav><div aria-busy="true"><div class="animate-pulse"></div></div><footer>जवाफदेही</footer>',
    );
    const verdict = checkHead(outage);
    expect(verdict.ok).toBe(false);
    expect(verdict.problems).toEqual(
      expect.arrayContaining([
        "empty or missing <title>",
        "no rel=canonical",
        "empty or missing meta description",
        'loading skeleton (aria-busy="true") in the served HTML',
      ]),
    );
    expect(verdict.problems.some((p) => p.startsWith("body is"))).toBe(true);
  });

  it("does not count script contents as body text", () => {
    // The dehydrated query state is tens of KB of JSON in a <script>; it held
    // the whole case while the visible page was a skeleton.
    const json = `<script id="__REACT_QUERY_STATE__" type="application/json">${"x".repeat(50_000)}</script>`;
    expect(bodyTextLength(page(GOOD_HEAD, `<p>short</p>${json}`))).toBeLessThan(10);
  });

  it.each([
    ["attributes in the other order", '<link href="https://jawafdehi.org/case/n/" rel="canonical"><meta content="वि" name="description">'],
    ["single quotes", "<link rel='canonical' href='https://jawafdehi.org/case/n/'><meta name='description' content='वि'>"],
    ["unquoted values", "<link rel=canonical href=https://jawafdehi.org/case/n/><meta name=description content=वि>"],
    ["a multi-token rel and upper case", '<LINK REL="alternate Canonical" HREF="https://jawafdehi.org/case/n/"><META NAME="Description" CONTENT="वि">'],
  ])("accepts valid markup a crawler accepts: %s", (_, head) => {
    // A false outage on a healthy page would teach everyone to ignore this check.
    const verdict = checkHead(page(`<title>नमुना</title>${head}`));
    expect(verdict.problems).toEqual([]);
  });

  it("still rejects a description that is only whitespace", () => {
    const head = GOOD_HEAD.replace('content="नमुना विवरण।"', 'content="   "');
    expect(checkHead(page(head)).problems).toContain("empty or missing meta description");
  });

  it("rejects a canonical that is not an absolute URL", () => {
    const relative = GOOD_HEAD.replace("https://jawafdehi.org/case/namuna/", "/case/namuna/");
    expect(checkHead(page(relative)).problems).toContain("no rel=canonical");
  });
});

describe("sitemapLocs", () => {
  it("reads every <loc>", () => {
    const xml =
      '<urlset><url><loc>https://jawafdehi.org/case/a/</loc></url>' +
      "<url><loc>\n  https://jawafdehi.org/case/b/  \n</loc></url></urlset>";
    expect(sitemapLocs(xml)).toEqual(["https://jawafdehi.org/case/a/", "https://jawafdehi.org/case/b/"]);
  });
});

describe("sample", () => {
  const items = Array.from({ length: 100 }, (_, i) => i);

  it("picks the same items for the same seed, so a failure can be re-run", () => {
    expect(sample(items, 8, 20261123)).toEqual(sample(items, 8, 20261123));
  });

  it("picks distinct items, and different ones for a different day", () => {
    const a = sample(items, 8, 20261123);
    expect(new Set(a).size).toBe(8);
    expect(sample(items, 8, 20261124)).not.toEqual(a);
  });

  it("never asks for more than there is", () => {
    expect(sample([1, 2, 3], 8, 1).sort()).toEqual([1, 2, 3]);
  });
});


describe("tagAttributes", () => {
  it("reads every tag of a kind, attributes in any order and quoting", () => {
    expect(tagAttributes(`<link rel="a" href='b'><link href=c rel=d>`, "link")).toEqual([
      { rel: "a", href: "b" },
      { href: "c", rel: "d" },
    ]);
  });
});

describe("pageVerdict", () => {
  it("does not follow a redirect — a sitemap must list the final URL", () => {
    // Following it would let the page that answered (a homepage, a fallback)
    // pass for the record that did not.
    const v = pageVerdict(301, "", "https://jawafdehi.org/", 1800);
    expect(v.ok).toBe(false);
    expect(v.problems[0]).toContain("redirect to https://jawafdehi.org/");
  });

  it("reports any other non-200 as itself", () => {
    expect(pageVerdict(410, "", null, 1800).problems).toEqual(["HTTP 410"]);
  });

  it("judges a 200 by its head", () => {
    expect(pageVerdict(200, page(GOOD_HEAD), null, 1800).ok).toBe(true);
  });
});
