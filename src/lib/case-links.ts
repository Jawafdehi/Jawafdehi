/**
 * The SPA path to a case page: `/case/<slug>/`.
 *
 * Slash-terminated because that is the canonical URL (CaseDetail's
 * rel=canonical and the sitemap). The edge 301s `/case/<slug>` to it, so every
 * slashless link cost crawlers and readers a redirect hop. One helper so the
 * dozen link sites cannot disagree again.
 *
 * The slug is used as stored: case slugs are URL-safe by construction, and some
 * legacy ones carry upper-case court refs (`…-081-CR-0081`) that the API
 * resolves case-sensitively.
 */
export function casePath(slug: string): string {
  return `/case/${slug.replace(/^\/+|\/+$/g, "")}/`;
}
