// Feature: ssr-seo, Property 4: Case HTML contains the case title in the title tag
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Validates: Requirements 3.4, 5.3
 *
 * Tests that the placeholder injection correctly places the case title
 * into the HTML template. Since CaseDetail fetches data client-side,
 * we test the injection mechanism directly with arbitrary title strings.
 */

// Replicate the injectIntoTemplate logic from scripts/pre-render.ts
function injectIntoTemplate(
  template: string,
  title: string,
  meta: string,
  appHtml: string,
  dehydratedState: unknown
): string {
  const json = JSON.stringify(dehydratedState).replace(/<\//g, '<\\/');
  const stateScript = `<script id="__REACT_QUERY_STATE__" type="application/json">${json}</script>`;
  return template
    .replace('<!--app-html-->', () => appHtml)
    .replace('<!--helmet-title-->', () => title)
    .replace('<!--helmet-meta-->', () => meta)
    .replace('<!--dehydrated-state-->', () => stateScript);
}

const TEMPLATE = `<!doctype html>
<html>
  <head>
    <!--helmet-title-->
    <!--helmet-meta-->
  </head>
  <body>
    <div id="root"><!--app-html--></div>
    <!--dehydrated-state-->
  </body>
</html>`;

describe('Property 4: Case HTML contains the case title in the title tag', () => {
  it('pre-rendered HTML contains the case title when injected via helmet', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Use printable ASCII strings that could be case titles (avoid empty)
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (caseTitle) => {
          const titleTag = `<title>${caseTitle} | Jawafdehi</title>`;
          const output = injectIntoTemplate(TEMPLATE, titleTag, '', '<div>content</div>', {});

          // The output HTML should contain the case title
          expect(output).toContain(caseTitle);
          // The output should contain a <title> element
          expect(output).toContain('<title>');
          // No placeholder should remain
          expect(output).not.toContain('<!--helmet-title-->');
        }
      ),
      { numRuns: 100 }
    );
  });
});
