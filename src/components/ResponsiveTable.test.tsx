import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

  it("contains no lookbehind in the shipped source", () => {
    // The actual regression guard. A lookbehind anywhere in this module is a
    // Safari < 16.4 parse error, and no behavioural test can catch it because
    // the test runner's engine supports lookbehind perfectly well — every case
    // above would stay green while real iOS users got a blank table.
    const source = readFileSync(
      resolve(process.cwd(), "src/components/ResponsiveTable.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/\(\?<[=!]/);
  });
});
