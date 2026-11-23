// SPDX-License-Identifier: Hippocratic-3.0
// Render one record page on request, and decide what the result means.
//
// The render itself is the same `render()` the build pre-renders with (see
// src/entry-server.tsx); this module adds what a request needs and a build does
// not: a short per-call API timeout, an overall deadline, and a verdict the
// Worker can act on — serve it (and cache it), 404, redirect, or give up so the
// edge serves its stale copy or the meta-injection shell instead.

import { encodeMaterialTail, isMaterialTail } from '../src/lib/material-meta';
import { injectIntoTemplate, type TemplateRenderResult } from '../src/lib/ssr-template';
import type { EdgeKind } from './edge-cache';

interface FailedQuery {
  reason: string;
  status?: number;
}

/** The slice of entry-server's exports the Worker uses. */
export interface EdgeBundle {
  render(
    url: string,
    seed?: unknown,
    options?: { edge?: boolean },
  ): Promise<
    TemplateRenderResult & { prefetch: { fulfilled: unknown[]; failed: FailedQuery[] } }
  >;
  setApiTimeout(ms: number): void;
  setPrerenderToken(token: string | null): void;
  template: string;
}

export interface EdgeRenderConfig {
  /** Per API call. */
  apiTimeoutMs: number;
  /** For the whole page: a court case makes several calls in sequence. */
  deadlineMs: number;
  token: string | null;
}

export type EdgeRenderOutcome =
  | { kind: 'ok'; html: string; tails: string[] }
  | { kind: 'not_found' }
  | { kind: 'moved'; location: string }
  | { kind: 'timeout'; reason: string }
  | { kind: 'error'; reason: string };

const DEADLINE = Symbol('deadline');

interface DehydratedQuery {
  queryKey?: unknown[];
  state?: { data?: unknown };
}

function queryData(dehydratedState: unknown, first: string): unknown[] {
  const queries = (dehydratedState as { queries?: DehydratedQuery[] } | null)?.queries ?? [];
  return queries
    .filter((q) => Array.isArray(q.queryKey) && q.queryKey[0] === first)
    .map((q) => q.state?.data);
}

function materialTailFromId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  try {
    const { pathname } = new URL(id);
    if (!pathname.startsWith('/material/')) return null;
    const tail = pathname
      .slice('/material/'.length)
      .replace(/\/+$/, '')
      .split('/')
      .map(decodeURIComponent)
      .join('/');
    return isMaterialTail(tail) ? tail : null;
  } catch {
    return null;
  }
}

const TIMEOUT_RE = /timeout|timed out|aborted|ECONNABORTED/i;

export async function renderEdgePage(
  bundle: EdgeBundle,
  kind: EdgeKind,
  tail: string,
  path: string,
  config: EdgeRenderConfig,
): Promise<EdgeRenderOutcome> {
  bundle.setApiTimeout(config.apiTimeoutMs);
  bundle.setPrerenderToken(config.token);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof DEADLINE>((resolve) => {
    timer = setTimeout(() => resolve(DEADLINE), config.deadlineMs);
  });

  let result: Awaited<ReturnType<EdgeBundle['render']>> | typeof DEADLINE;
  try {
    result = await Promise.race([bundle.render(path, undefined, { edge: true }), deadline]);
  } catch (err) {
    return { kind: 'error', reason: `render threw: ${String((err as Error)?.message ?? err)}` };
  } finally {
    clearTimeout(timer);
  }
  if (result === DEADLINE) {
    return { kind: 'timeout', reason: `page not rendered within ${config.deadlineMs} ms` };
  }

  const { failed, fulfilled } = result.prefetch;
  // A positive "no such record" (a renamed slug, a retired ident, a hidden
  // draft) is an answer; serve the real 404, exactly as the meta fallback does.
  if (failed.some((f) => f.status === 404 || f.status === 410)) return { kind: 'not_found' };
  if (failed.length > 0) {
    const timedOut = failed.every((f) => f.status === undefined && TIMEOUT_RE.test(f.reason));
    const reason = failed.map((f) => (f.status ? `${f.status} ${f.reason}` : f.reason)).join('; ');
    return timedOut ? { kind: 'timeout', reason } : { kind: 'error', reason };
  }
  // Every record route prefetches its record. Nothing fulfilled means a branch
  // stopped matching, and a page with an empty cache is a skeleton: never cache
  // that under a record's URL for an hour.
  if (fulfilled.length === 0) return { kind: 'error', reason: 'no data was prefetched for this page' };

  // Prefetching is necessary but not sufficient: the page also has to USE what
  // was prefetched. A component reading the cache under a key the prefetch did
  // not write gets a miss, renders its loading skeleton, and never reaches its
  // <Seo> — so the prefetch report is clean, `fulfilled` is non-empty, and the
  // page is still a blank-titled skeleton. That shipped for three days after
  // #465 added a DEV-only element to CaseDetail's query key, and nothing here
  // noticed, because nothing here looked at the output.
  //
  // A record page without a title is never correct, so treat it as a failure:
  // the edge serves its stale copy or the meta-injection shell, and the empty
  // page is not cached under the record's URL for an hour.
  const title = result.helmetContext.helmet?.title?.toString() ?? '';
  if (!/>[^<]+</.test(title)) {
    return { kind: 'error', reason: 'rendered page has no title (component did not consume its data)' };
  }

  const tails = [tail];
  if (kind === 'case') {
    for (const data of queryData(result.dehydratedState, 'case')) {
      const slug = (data as { slug?: unknown } | null)?.slug;
      if (typeof slug !== 'string' || !slug.trim()) continue;
      // The API resolves a case's earlier slugs (its slug history) to the case
      // itself, so an old URL used to render the whole page a second time with
      // only a rel=canonical pointing at the current one — 200 on a duplicate,
      // which Search Console files under "Alternate page with proper canonical"
      // and still crawls. Send it to the current URL instead, as for materials.
      if (slug !== tail) {
        return { kind: 'moved', location: `/case/${encodeURIComponent(slug)}/` };
      }
    }
  }
  if (kind === 'material') {
    // The API 301s a re-filed document's old address to its new one, and the
    // HTTP client follows it — so the record that came back can be a different
    // document from the one the URL names. Send the reader to its current page
    // (as the meta fallback does) rather than render it under the old URL.
    for (const data of queryData(result.dehydratedState, 'datalake-material')) {
      const current = materialTailFromId((data as { '@id'?: unknown } | null)?.['@id']);
      if (current && current !== tail) {
        return { kind: 'moved', location: `/material/${encodeMaterialTail(current)}` };
      }
    }
  }

  return { kind: 'ok', html: injectIntoTemplate(bundle.template, result), tails };
}
