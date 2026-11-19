// SPDX-License-Identifier: Hippocratic-3.0
// Fill the built index.html template with one rendered page.
//
// Shared by the two places that server-render: `scripts/pre-render.ts` (build
// time, Node) and `worker/edge-ssr.ts` (request time, at the edge). Both must
// produce byte-identical documents for the same render, or a page served from
// the edge would differ from the same page pre-rendered — so the substitution
// lives here once rather than being copied into the Worker.
//
// Pure string work: no DOM, no Node or Worker APIs, safe to import from either.

/** The part of entry-server's RenderResult the template needs. */
export interface TemplateRenderResult {
  html: string;
  helmetContext: {
    helmet?: {
      title?: { toString(): string };
      meta?: { toString(): string };
      link?: { toString(): string };
      script?: { toString(): string };
      style?: { toString(): string };
      noscript?: { toString(): string };
      htmlAttributes?: { toString(): string };
    };
  };
  dehydratedState: unknown;
}

export function injectIntoTemplate(template: string, result: TemplateRenderResult): string {
  const { html, helmetContext, dehydratedState } = result;
  const h = helmetContext.helmet;
  const title = h?.title?.toString() ?? '';
  const meta = [
    h?.meta?.toString() ?? '',
    h?.link?.toString() ?? '',
    h?.script?.toString() ?? '',
    h?.style?.toString() ?? '',
    h?.noscript?.toString() ?? '',
  ].filter(s => s.trim()).join('\n    ');
  const json = JSON.stringify(dehydratedState).replace(/<\//g, '<\\/');
  const stateScript = `<script id="__REACT_QUERY_STATE__" type="application/json">${json}</script>`;

  // A page may override the document language via Helmet's <html lang="…" />.
  // Only the title and the meta block were substituted here, so that override
  // was silently dropped and every pre-rendered page shipped index.html's
  // lang="ne" — including /research/corruption-accountability, which is served
  // English-only and declares lang="en". A crawler then read Nepali markup
  // language with an en_US og:locale, which is the same contradiction #300 set
  // out to remove, just from the other side.
  //
  // Narrow on purpose: lang is the only attribute any page overrides, and
  // rewriting the whole <html> tag from htmlAttributes would drop the
  // translate="no" the template carries.
  const lang = h?.htmlAttributes?.toString().match(/lang="([^"]+)"/)?.[1];

  return template
    .replace('<!--app-html-->', () => html)
    .replace('<!--helmet-title-->', () => title)
    .replace('<!--helmet-meta-->', () => meta)
    .replace('<!--dehydrated-state-->', () => stateScript)
    .replace(/<html lang="[^"]*"/, (match) => (lang ? `<html lang="${lang}"` : match));
}
