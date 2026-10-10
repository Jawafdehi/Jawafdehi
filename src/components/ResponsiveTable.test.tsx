import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { ResponsiveTable } from "@/components/ResponsiveTable";

/**
 * Inline markdown rendering, with emphasis on the lookbehind-free `*em*` rule.
 *
 * The rule used to be written with lookbehind, which is a PARSE-time
 * SyntaxError on Safari < 16.4 — it took the whole chunk down rather than
 * merely losing italics. These cases pin the behaviour the rewrite has to
 * preserve, so a future "simplification" back to lookbehind is caught here
 * rather than by iOS users.
 */

function html(markdown: string): string {
  const { container } = render(<ResponsiveTable html={markdown} />);
  return container.innerHTML;
}

describe("ResponsiveTable inline markdown", () => {
  it("renders single-asterisk emphasis", () => {
    expect(html("an *emphasised* word")).toContain("an <em>emphasised</em> word");
  });

  it("renders emphasis at the very start of the string", () => {
    // The `^` branch of `(^|[^*])` — the case the leading lookbehind used to cover.
    expect(html("*leading* text")).toContain("<em>leading</em> text");
  });

  it("still renders bold and bold-italic", () => {
    expect(html("**bold**")).toContain("<strong>bold</strong>");
    expect(html("***both***")).toContain("<strong><em>both</em></strong>");
  });

  it("does not turn bold into emphasis", () => {
    const out = html("**bold** and *em*");

    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>em</em>");
  });

  it("handles two emphasised runs on one line", () => {
    expect(html("*one* and *two*")).toContain("<em>one</em> and <em>two</em>");
  });

  it("keeps emphasis around an unpaired double asterisk", () => {
    // Regression: a content class of [^*]+? dropped this entirely, because the
    // ** here is not a bold delimiter and so is never consumed by the rule above.
    expect(html("*note: 5**2 is 25*")).toContain("<em>note: 5**2 is 25</em>");
  });

  it("leaves a lone asterisk alone", () => {
    const out = html("2 * 3 = 6");

    expect(out).not.toContain("<em>");
  });

  it("escapes angle brackets on the markdown path", () => {
    // Input that does NOT look like HTML, so prepareHtml() routes it through
    // convertMarkdownToHtml() rather than passing it straight to
    // dangerouslySetInnerHTML. (Content that does look like HTML is passed
    // through by design — see isHtmlContent.)
    const out = html("*a < b*");

    expect(out).toContain("&lt;");
    expect(out).toContain("<em>");
  });

  it("contains no lookbehind anywhere in src/", () => {
    // The actual regression guard, and it is repo-wide on purpose. A lookbehind
    // in ANY module under src/ is a Safari < 16.4 parse error that takes that
    // chunk down, so scoping this to one file would leave the next one
    // unguarded. No behavioural test can catch it either: the runner's engine
    // supports lookbehind perfectly well, so every case above stays green while
    // real iOS users get a blank page.
    const root = resolve(process.cwd(), "src");
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          if (/\(\?<[=!]/.test(readFileSync(full, "utf8"))) {
            offenders.push(full.slice(root.length + 1));
          }
        }
      }
    };
    walk(root);

    expect(offenders).toEqual([]);
  });
});
