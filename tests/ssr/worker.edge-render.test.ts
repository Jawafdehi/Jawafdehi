// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi } from 'vitest';

import { renderEdgePage, type EdgeBundle } from '../../worker/edge-render';

// renderEdgePage turns one render into a verdict the Worker can act on. The
// cases that matter are the ones where caching the wrong thing for an hour is
// the failure: a skeleton, an error page, or a moved document under its old URL.

const TEMPLATE =
  '<html lang="ne"><head><!--helmet-title--><!--helmet-meta--></head>' +
  '<body><div id="root"><!--app-html--></div><!--dehydrated-state--></body></html>';

type RenderResult = Awaited<ReturnType<EdgeBundle['render']>>;

function result(overrides: Partial<RenderResult> = {}): RenderResult {
  return {
    html: '<main>page</main>',
    helmetContext: { helmet: { title: { toString: () => '<title>T</title>' } } },
    dehydratedState: { queries: [] },
    prefetch: { fulfilled: [['x']], failed: [] },
    ...overrides,
  };
}

function bundleWith(render: EdgeBundle['render']): EdgeBundle & {
  setApiTimeout: ReturnType<typeof vi.fn>;
  setPrerenderToken: ReturnType<typeof vi.fn>;
} {
  return { render, setApiTimeout: vi.fn(), setPrerenderToken: vi.fn(), template: TEMPLATE };
}

const CONFIG = { apiTimeoutMs: 4000, deadlineMs: 8000, token: 'tok' };

describe('renderEdgePage', () => {
  it('renders into the template, in edge mode, with the timeout and token installed', async () => {
    const render = vi.fn(async () => result());
    const bundle = bundleWith(render);
    const outcome = await renderEdgePage(bundle, 'entity', 'person/x', '/entity/person/x', CONFIG);

    expect(outcome).toEqual({
      kind: 'ok',
      html: expect.stringContaining('<div id="root"><main>page</main></div>'),
      tails: ['person/x'],
    });
    expect(render).toHaveBeenCalledWith('/entity/person/x', undefined, { edge: true });
    expect(bundle.setApiTimeout).toHaveBeenCalledWith(4000);
    expect(bundle.setPrerenderToken).toHaveBeenCalledWith('tok');
  });

  it('sends a superseded case slug to the current one instead of rendering a duplicate', async () => {
    // The API follows a case's slug history, so the old URL's render comes back
    // holding the case under its current slug. Rendering it would serve a second
    // 200 copy of the page with only a canonical pointing away.
    const bundle = bundleWith(async () =>
      result({
        dehydratedState: { queries: [{ queryKey: ['case', 'old'], state: { data: { slug: 'new' } } }] },
      }),
    );
    const outcome = await renderEdgePage(bundle, 'case', 'old', '/case/old/', CONFIG);
    expect(outcome).toEqual({ kind: 'moved', location: '/case/new/' });
  });

  it('renders a case requested under its current slug', async () => {
    const bundle = bundleWith(async () =>
      result({
        dehydratedState: { queries: [{ queryKey: ['case', 'current'], state: { data: { slug: 'current' } } }] },
      }),
    );
    const outcome = await renderEdgePage(bundle, 'case', 'current', '/case/current/', CONFIG);
    expect(outcome.kind === 'ok' && outcome.tails).toEqual(['current']);
  });

  it('reports a 404 from the API as not found', async () => {
    const bundle = bundleWith(async () =>
      result({ prefetch: { fulfilled: [], failed: [{ reason: 'API Error: No Case matches', status: 404 }] } }),
    );
    expect(await renderEdgePage(bundle, 'case', 'gone', '/case/gone', CONFIG)).toEqual({ kind: 'not_found' });
  });

  it('reports an API timeout as a timeout, not an error', async () => {
    const bundle = bundleWith(async () =>
      result({ prefetch: { fulfilled: [], failed: [{ reason: 'AxiosError: timeout of 4000ms exceeded' }] } }),
    );
    expect((await renderEdgePage(bundle, 'material', 'ag/10', '/material/ag/10', CONFIG)).kind).toBe('timeout');
  });

  it('reports a 5xx as an error', async () => {
    const bundle = bundleWith(async () =>
      result({ prefetch: { fulfilled: [], failed: [{ reason: 'Request failed', status: 502 }] } }),
    );
    expect((await renderEdgePage(bundle, 'material', 'ag/10', '/material/ag/10', CONFIG)).kind).toBe('error');
  });

  it('never returns a page whose cache came back empty', async () => {
    const bundle = bundleWith(async () => result({ prefetch: { fulfilled: [], failed: [] } }));
    expect((await renderEdgePage(bundle, 'entity', 'a/b', '/entity/a/b', CONFIG)).kind).toBe('error');
  });

  // The failure this one guards is the nastiest shape available here, because
  // every other signal says the render went fine: the prefetch resolved, the
  // cache is full, nothing threw. The component simply read the cache under a
  // key nobody wrote and rendered its skeleton. #465 did this to every case
  // page for three days by appending a DEV-only element to CaseDetail's key.
  it('rejects a page that prefetched fine but rendered no title', async () => {
    const bundle = bundleWith(async () =>
      result({
        html: '<main><div class="animate-pulse" /></main>',
        helmetContext: { helmet: { title: { toString: () => '<title data-rh="true"></title>' } } },
        prefetch: { fulfilled: [['case', 'x']], failed: [] },
      }),
    );
    const outcome = await renderEdgePage(bundle, 'case', 'x', '/case/x/', CONFIG);
    expect(outcome.kind).toBe('error');
    expect(outcome.kind === 'error' && outcome.reason).toContain('no title');
  });

  it('rejects a page with no title element at all', async () => {
    const bundle = bundleWith(async () => result({ helmetContext: { helmet: {} } }));
    expect((await renderEdgePage(bundle, 'entity', 'person/x', '/entity/person/x', CONFIG)).kind).toBe('error');
  });

  it('gives up at the deadline', async () => {
    vi.useFakeTimers();
    try {
      const bundle = bundleWith(() => new Promise(() => {}));
      const pending = renderEdgePage(bundle, 'courtcase', 'c/1', '/courtcase/c/1', { ...CONFIG, deadlineMs: 50 });
      await vi.advanceTimersByTimeAsync(60);
      expect((await pending).kind).toBe('timeout');
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a render that throws as an error', async () => {
    const bundle = bundleWith(async () => {
      throw new Error('boom');
    });
    expect((await renderEdgePage(bundle, 'case', 'x', '/case/x', CONFIG)).kind).toBe('error');
  });

  it('redirects a re-filed material to its current page', async () => {
    const bundle = bundleWith(async () =>
      result({
        dehydratedState: {
          queries: [
            {
              queryKey: ['datalake-material', 'old_source/7'],
              state: { data: { '@id': 'https://jawafdehi.org/material/new_source/7' } },
            },
          ],
        },
      }),
    );
    expect(await renderEdgePage(bundle, 'material', 'old_source/7', '/material/old_source/7', CONFIG)).toEqual({
      kind: 'moved',
      location: '/material/new_source/7',
    });
  });

  it('serves a material whose id matches its URL', async () => {
    const bundle = bundleWith(async () =>
      result({
        dehydratedState: {
          queries: [
            { queryKey: ['datalake-material', 'ag/10'], state: { data: { '@id': 'https://jawafdehi.org/material/ag/10' } } },
          ],
        },
      }),
    );
    expect((await renderEdgePage(bundle, 'material', 'ag/10', '/material/ag/10', CONFIG)).kind).toBe('ok');
  });
});
