// SPDX-License-Identifier: Hippocratic-3.0
import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from '../../worker';

// The Worker serves a case's head itself whenever the edge render does not —
// a case published since the last deploy, or an edge render that timed out.
// Its <title> must be the page's own, or the same case is titled two ways
// depending on which path served it. Both now come from caseMetaTitle in
// src/utils/seo; this pins the Worker side.

const INDEX_HTML =
  '<!doctype html><html><head><!--helmet-title--><!--helmet-meta--></head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } })
          : new Response('not found', { status: 404 }),
    },
  };
}

// Fictional, per the repo's fixture rule: never assert corruption against a
// real body or person. 099-* cannot collide with a real register entry.
function stubCaseApi(caseData: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/cases/')) {
        return new Response(
          JSON.stringify({
            slug: 'namuna-cooperative-fraud',
            state: 'PUBLISHED',
            short_description: 'नमुना सहकारी प्रकरणको परीक्षण विवरण।',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
            ...caseData,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('', { status: 404 });
    }),
  );
}

async function titleOf(): Promise<string> {
  const res = await worker.fetch(new Request('https://jawafdehi.org/case/namuna-cooperative-fraud/'), makeEnv());
  const html = await res.text();
  return /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker case-meta fallback: <title>', () => {
  it('carries the lead court number, exactly as the page does', async () => {
    stubCaseApi({
      title: 'Namuna Cooperative Fraud',
      court_cases: ['https://jawafdehi.org/courtcase/kathmandudc/099-c4-9001'],
    });
    expect(await titleOf()).toBe('Namuna Cooperative Fraud (099-C4-9001) | Jawafdehi');
  });

  it('does not repeat a number the title already carries', async () => {
    stubCaseApi({
      title: 'नमुना सहकारी प्रकरण (099-C4-9001)',
      court_cases: ['https://jawafdehi.org/courtcase/kathmandudc/099-c4-9001'],
    });
    expect(await titleOf()).toBe('नमुना सहकारी प्रकरण (099-C4-9001) | Jawafdehi');
  });

  it('carries the English title too, exactly as the page does', async () => {
    stubCaseApi({
      title: 'नमुना सहकारी प्रकरण',
      title_en: 'Namuna Cooperative Fraud',
      court_cases: ['https://jawafdehi.org/courtcase/kathmandudc/099-c4-9001'],
    });
    expect(await titleOf()).toBe('नमुना सहकारी प्रकरण · Namuna Cooperative Fraud (099-C4-9001) | Jawafdehi');
  });

  it('survives an API that sends no court cases at all', async () => {
    stubCaseApi({ title: 'Namuna Cooperative Fraud' });
    expect(await titleOf()).toBe('Namuna Cooperative Fraud | Jawafdehi');
  });
});
