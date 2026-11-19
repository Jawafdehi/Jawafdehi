/**
 * `rel` for every link to an ORIGINAL source document: a court order, charge
 * sheet, press-release PDF or scan, on ngm-store/s3, the /document-preview
 * proxy, or the issuing body's own site.
 *
 * Originals can contain private data that only our redacted transcripts and
 * case pages may expose to search, so search engines must not index them.
 * `nofollow` stops our pages from handing them crawl priority or a ranking
 * signal. On its own it does not keep a URL out of the index; the files
 * themselves carry `X-Robots-Tag: noindex`: on jawafdehi.org's
 * /document-preview from the Worker, and on the bucket hosts from the zone-wide
 * Cloudflare rule.
 */
export const ORIGINAL_DOCUMENT_REL = "nofollow noopener noreferrer";
