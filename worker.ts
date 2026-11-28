import { WorkerEntrypoint } from 'cloudflare:workers';
import { LEGACY_CASE_MAP } from './src/utils/legacyCaseMap';
import { LEGACY_ENTITY_MAP } from './src/utils/legacyEntityMap';
import { isNoindexPath, matchRoute, normalizePath } from './src/data/route-patterns';
import { RESEARCH_URL } from './src/lib/external-links';
import { courtRefCandidates } from './src/utils/courtCaseRef';
import { DOCUMENT_PREVIEW_ALLOWED_HOSTS } from './src/utils/document-preview-url';
import {
  encodeMaterialTail,
  isMaterialTail,
  materialCanonicalUrl,
  materialDescriptionText,
  materialDisplayName,
  materialJsonLd,
  materialMetaDescription,
  materialMetaTitle,
  materialCardUrl,
  MATERIAL_CARD_WIDTH,
  MATERIAL_CARD_HEIGHT,
  materialRobots,
  materialTypeLabel,
  type MaterialMetaSource,
} from './src/lib/material-meta';
import { JAWAFDEHI_WEEKLY_SERIES } from './src/config/constants';
import { archiveSearchUrl, retiredBrowseType } from './src/lib/archive-redirect';
import {
  AUTHOR_CARD_HEIGHT,
  AUTHOR_CARD_WIDTH,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_URL,
  authorCardUrl,
  buildHeadTags,
  caseMetaDescription,
  caseMetaTitle,
  escapeHtml,
  previewImageUrl,
  renderHeadTagsToHtml,
  stripHtml,
  truncateMeta,
} from './src/utils/seo';
import { edgeApiTokenNoWait } from './worker/api-token';
import { bundle as edgeBundle } from './worker/edge-bundle';
import {
  CACHE_CONTROL_BROWSER,
  CACHE_CONTROL_FALLBACK,
  EDGE_CDN_CACHE_CONTROL,
  edgeKindForRoute,
  pageTags,
  parsePurgeBody,
  routeTail,
  verifyPurgeSignature,
} from './worker/edge-cache';
import { renderEdgeListing, renderEdgePage } from './worker/edge-render';
import { crawlableListing, listingPath } from './src/lib/crawlable-listing';
import {
  API_ORIGIN,
  SITEMAP_BROWSER_CACHE_CONTROL,
  SITEMAP_CDN_CACHE_CONTROL,
  SITEMAP_FETCH_TIMEOUT_MS,
  sitemapUpstreamPath,
  withCanonicalSlashes,
  withSiteSitemap,
} from './worker/sitemap';

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  // Edge SSR (see EdgePages below). Plain vars from wrangler.toml unless noted.
  /** "off" turns edge rendering off; pages then get the meta-injection shell. */
  EDGE_SSR?: string;
  /** Per API call made while rendering. Default 4000. */
  EDGE_SSR_API_TIMEOUT_MS?: string;
  /** For the whole render (a court case makes several calls). Default 8000. */
  EDGE_SSR_DEADLINE_MS?: string;
  /** Secret: the sa-prerender machine user, for the API's throttle scope. Optional. */
  EDGE_API_CLIENT_ID?: string;
  /** Secret, as above. */
  EDGE_API_CLIENT_SECRET?: string;
  /**
   * Secret: sent as X-Jawafdehi-Edge-Secret on render API calls so the API
   * counts the Worker in its own `edge` throttle bucket (EDGE_SSR_SECRET there).
   * Optional: unset = renders are counted by the Worker's egress address.
   */
  EDGE_SSR_API_SECRET?: string;
  /** Secret: HMAC key the API signs /_cache/purge requests with. Unset = purge route off. */
  CACHE_PURGE_SECRET?: string;
}

// The slice of the runtime's ExecutionContext this Worker uses. Optional
// throughout: the unit tests call fetch(request, env) with no context at all.
interface CachePurgeResult {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
}
interface EdgeCacheApi {
  purge(options: { tags: string[] }): Promise<CachePurgeResult>;
}
interface WorkerContext {
  waitUntil?(promise: Promise<unknown>): void;
  exports?: { EdgePages?: { fetch(request: Request): Promise<Response> } };
  cache?: EdgeCacheApi;
}

const JDS_API_BASE = 'https://api.jawafdehi.org/api';
const CMS_API_BASE = `${JDS_API_BASE}/cms/v2`;
// Uploaded media (case banners/thumbnails, CMS images) are served from the
// portal origin, so relative media paths must resolve against it — not the
// frontend origin — or shared links get broken Open Graph images.
const MEDIA_BASE = 'https://portal.jawafdehi.org';
// Bound upstream API calls made while injecting share metadata so a slow backend
// can never hang the edge request; on timeout we fall through to the SPA shell.
const META_FETCH_TIMEOUT_MS = 4000;
// Composing a card costs the API a photo fetch plus a render, so it gets a
// longer budget than a JSON read. Still bounded: on timeout the card route falls
// back to the static banner rather than holding the crawler.
const CARD_FETCH_TIMEOUT_MS = 10000;
// A day, matching the API's `s-maxage`. This is the window in which a profile
// edit (new photo, corrected role) reaches a shared link.
const AUTHOR_CARD_TTL_SECONDS = 86400; // also the document cards' TTL

// X-Robots-Tag for every response that serves an original source document.
const ORIGINAL_DOCUMENT_ROBOTS = 'noindex, nofollow, noarchive';

const MAX_LATEST_VIDEOS = 6;

interface FeedVideo {
  videoId: string;
  title: string;
  published: string | null;
  url: string;
  thumbnail: string;
  thumbnailMaxRes: string;
}

function securityHeaders(): Record<string, string> {
  // Third-party allowances layered onto the same-origin baseline:
  //   script-src  — googletagmanager (GA4 gtag.js) + cloudflareinsights (RUM beacon.min.js)
  //   connect-src — *.ingest.de.sentry.io (Sentry envelopes), googletagmanager +
  //                 *.google-analytics.com / *.analytics.google.com (GA4 collect),
  //                 cloudflareinsights.com (RUM /cdn-cgi/rum POST)
  //   frame-src   — zeffy.com, the /donate donation form (components/donate/pay-card).
  //                 There was no frame-src at all, so it fell through to
  //                 `default-src 'self'` and the donation dialog would have opened
  //                 on a blocked frame. Scoped to that one host: nothing else on
  //                 this site frames a third party.
  // Without these the SPA loads gtag/Sentry/RUM but the browser blocks every
  // request, so analytics silently record nothing and prod errors never reach Sentry.
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://www.zeffy.com; connect-src 'self' https://api.jawafdehi.org https://portal.jawafdehi.org https://jawafdehi.org https://nes.jawafdehi.org https://auth.jawafdehi.org https://*.ingest.de.sentry.io https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://cloudflareinsights.com; worker-src 'self' blob:;",
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

function securityHeadersAllowFrame(): Record<string, string> {
  const headers = securityHeaders();
  delete headers['X-Frame-Options'];
  return headers;
}

const CMS_ADMIN_ORIGIN = 'https://api.jawafdehi.org';

// Headers for the Wagtail headless preview route. Unlike the embed widget
// (framable anywhere), the preview shows an unsaved draft, so we scope framing
// to the CMS admin via CSP frame-ancestors (which supersedes X-Frame-Options,
// removed here so it doesn't block the admin), and add X-Robots-Tag so the
// draft is never indexed even when the SPA shell is served before JS runs.
function previewSecurityHeaders(): Record<string, string> {
  const headers = securityHeaders();
  delete headers['X-Frame-Options'];
  headers['Content-Security-Policy'] +=
    ` frame-ancestors ${CMS_ADMIN_ORIGIN};`;
  headers['X-Robots-Tag'] = 'noindex, nofollow';
  return headers;
}

function jsonResponse(body: unknown, status = 200, maxAge = 300): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': `public, max-age=${maxAge}`,
    },
  });
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, '&');
}

// Returns the channel's most recent uploads (id, title, watch URL, thumbnails)
// by reading the public YouTube Atom feed server-side — no API key, and the
// Worker hop sidesteps the feed's lack of CORS headers. Successful responses are
// cached at the Cloudflare edge (shared across users) so the feed is fetched at
// most once per TTL regardless of traffic, and it refreshes on its own each week
// with no rebuild or manual step.
async function handleLatestVideos(request: Request): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const channelId = JAWAFDEHI_WEEKLY_SERIES.youtubeChannelId;
  try {
    const feedResponse = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { headers: { Accept: 'application/atom+xml' } },
    );

    if (!feedResponse.ok) {
      return jsonResponse({ error: 'Failed to fetch channel feed' }, 502, 60);
    }

    const xml = await feedResponse.text();
    const videos: FeedVideo[] = [];
    for (const match of xml.matchAll(/<entry[^>]*>[\s\S]*?<\/entry>/g)) {
      const entry = match[0];
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      if (!videoId) {
        continue;
      }
      const rawTitle = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? '';
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? null;
      videos.push({
        videoId,
        title: decodeXmlEntities(rawTitle).trim(),
        published,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        thumbnailMaxRes: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      });
      if (videos.length >= MAX_LATEST_VIDEOS) {
        break;
      }
    }

    if (videos.length === 0) {
      return jsonResponse({ error: 'No videos found' }, 404, 60);
    }

    const response = jsonResponse({ videos }, 200, 1800);
    // Only successful responses are cached at the edge (errors use short TTLs).
    await cache.put(request, response.clone());
    return response;
  } catch {
    return jsonResponse({ error: 'Failed to fetch latest videos' }, 502, 60);
  }
}

// Resolve a bare court case number (e.g. "081-CR-0116") to its canonical slug
// by probing the known court identifiers against the cases API. Returns null if
// no case resolves (or the resolved case has no slug), so the caller falls
// through to normal handling.
async function resolveCourtRefSlug(ref: string): Promise<string | null> {
  for (const identifier of courtRefCandidates(ref)) {
    try {
      const apiUrl = `${JDS_API_BASE}/cases/${encodeURIComponent(identifier)}/`;
      const apiResponse = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
      if (!apiResponse.ok) {
        continue;
      }
      const caseData = (await apiResponse.json()) as { slug?: string | null };
      if (caseData.slug) {
        return caseData.slug;
      }
    } catch {
      // Network/parse failure: fall through to the next identifier.
    }
  }
  return null;
}

async function handleOembed(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const apiUrl = new URL(`${JDS_API_BASE}/oembed/`);
  url.searchParams.forEach((value, key) => {
    apiUrl.searchParams.set(key, value);
  });

  try {
    const apiResponse = await fetch(apiUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    return new Response(apiResponse.body, {
      status: apiResponse.status,
      headers: {
        'Content-Type': apiResponse.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': apiResponse.ok ? 'public, max-age=300' : 'no-store',
      },
    });
  } catch {
    return jsonResponse({ error: 'Failed to fetch case data' }, 502);
  }
}

function getPreviewFilename(targetUrl: URL): string {
  const lastSegment = targetUrl.pathname.split('/').filter(Boolean).pop();
  return lastSegment ? decodeURIComponent(lastSegment).replace(/["\\]/g, '') : 'document';
}

async function handleDocumentPreview(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  if (!target) {
    return jsonResponse({ error: 'Missing document URL' }, 400);
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(target);
  } catch {
    return jsonResponse({ error: 'Invalid document URL' }, 400);
  }

  if (targetUrl.protocol !== 'https:' || !DOCUMENT_PREVIEW_ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return jsonResponse({ error: 'Document host is not allowed' }, 403);
  }

  const upstream = await fetch(targetUrl.toString(), {
    headers: {
      'Accept': 'application/pdf,text/markdown,text/plain,*/*',
    },
  });

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cache-Control', upstream.ok ? 'public, max-age=3600' : 'no-store');
  // This route serves ORIGINAL source files (court orders, charge sheets, scans)
  // under jawafdehi.org, the one host the zone-wide Cloudflare noindex rule
  // exempts. Originals can carry private data that only our redacted
  // transcripts and case pages may expose to search, so they must never be
  // indexed. A header rather than a robots.txt Disallow: Disallow stops the
  // fetch, so Google could still list the URL from a link and could never read
  // a noindex to drop one it already has. Fresh `Headers` above, so the
  // upstream bucket's own X-Robots-Tag would otherwise be lost here.
  headers.set('X-Robots-Tag', ORIGINAL_DOCUMENT_ROBOTS);

  const contentLength = upstream.headers.get('Content-Length');
  if (contentLength) headers.set('Content-Length', contentLength);

  if (url.searchParams.get('download') === '1') {
    headers.set('Content-Disposition', `attachment; filename="${getPreviewFilename(targetUrl)}"`);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

// --------------------------------------------------------------------------
// Dynamic share-preview metadata
//
// Case and update pages are pre-rendered at build time with correct Open Graph
// / Twitter tags, so the vast majority of shared links resolve to a static file
// with baked-in metadata. This fallback covers the gap for a record published
// AFTER the last build: instead of serving the bare SPA shell (whose default
// tags would make every fresh case look identical when shared), we fetch the
// record and inject its real title, description, and image into the shell so
// every platform's crawler (Facebook, X/Twitter, LinkedIn, WhatsApp, Slack,
// Discord, iMessage, Telegram, …) sees the right preview. All these platforms
// read the same Open Graph / Twitter Card tags, so one injection covers them.
// --------------------------------------------------------------------------

// Fetch with a hard timeout. Resolves to null (rather than throwing) on timeout,
// network error, or non-OK status, so callers cleanly fall through to the SPA.
async function fetchWithTimeout(
  url: string,
  redirect: RequestRedirect = 'follow',
  timeoutMs: number = META_FETCH_TIMEOUT_MS,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Returned whatever the status, so callers can tell "the API says this
    // record does not exist" (404 → serve a real 404) apart from "the API did
    // not answer" (null → fall through to the shell rather than deindex a
    // live page over a slow backend).
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Like fetchWithTimeout, but asks for an image and allows a longer budget.
// Resolves to null on timeout or network error so the caller can fall back.
async function fetchImageWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CARD_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Accept: 'image/jpeg,image/*' },
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildMetaTags(input: {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  imageAlt: string;
  // Only for an image whose size is known — omitted otherwise, since claiming
  // dimensions for the site-wide fallback card would be wrong.
  imageWidth?: number;
  imageHeight?: number;
  // 'profile' is for an author page — a person, not a document.
  type?: 'article' | 'website' | 'profile';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  // When set (e.g. "noindex, nofollow"), emit a robots meta so crawlers keep
  // "unlisted" (non-PUBLISHED) records out of search — link-only, not indexed.
  robots?: string | null;
}): string {
  // The tag list is shared with <Seo> so the head a scraper gets from the edge
  // matches the head the app renders — see buildHeadTags in src/utils/seo.
  return renderHeadTagsToHtml(buildHeadTags({ ...input, type: input.type ?? 'article' }));
}

// Strip the head tags we are about to override (title, canonical, and the
// Open Graph / Twitter / description meta) from a head fragment. The asset the
// worker fetches for the shell is the PRE-RENDERED homepage (`dist/index.html`),
// which already has baked-in tags and no helmet placeholders — so without this
// the appended tags would produce two <title>, two og:title, two canonical, …
// in one head and crawlers would show the generic homepage preview. Regexes are
// scoped to the head region and rely on real `>`/quotes inside attribute values
// always being HTML-escaped (both helmet and buildMetaTags escape them), so
// `[^>]*` never overruns an attribute. Function-form replacements are used so a
// `$`-containing match is never treated as a replacement pattern.
function stripOverriddenHeadTags(head: string): string {
  return head
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, () => '')
    .replace(/<meta\b[^>]*\bproperty=["'](?:og|article):[^"']*["'][^>]*>/gi, () => '')
    // twitter:site is site-wide (index.html) and buildHeadTags does not re-emit
    // it, so stripping it here would drop the @handle from every shared case and
    // update — the only pages this override runs for.
    .replace(/<meta\b[^>]*\bname=["']twitter:(?!site\b)[^"']*["'][^>]*>/gi, () => '')
    .replace(/<meta\b[^>]*\bname=["']description["'][^>]*>/gi, () => '')
    .replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>/gi, () => '')
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, () => '');
}

// The title the shell carries under any path but `/`: the site name and
// nothing that describes the homepage.
const SHELL_TITLE = 'Jawafdehi';

// Remove the head tags that claim the HOMEPAGE's identity from the shell, for
// when it is served under some other path: its URL (rel=canonical, og:url) and
// what it says it is (the description and the social title/description). The
// <title> becomes the bare site name. Left in place, a crawler that does not run
// the SPA read the page as a second homepage — the same title and description
// on every such path. The SPA sets the page's own head once it runs. Head only,
// and the same attribute-escaping assumption as stripOverriddenHeadTags.
export function stripHomepageUrlClaims(html: string): string {
  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) return html;
  const head = html
    .slice(0, headEnd)
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, () => '')
    .replace(/<meta\b[^>]*\bproperty=["']og:(?:url|title|description)["'][^>]*>/gi, () => '')
    .replace(/<meta\b[^>]*\bname=["'](?:description|twitter:title|twitter:description)["'][^>]*>/gi, () => '')
    .replace(/<title\b([^>]*)>[\s\S]*?<\/title>/i, (_m, attrs: string) => `<title${attrs}>${SHELL_TITLE}</title>`);
  return head + html.slice(headEnd);
}

// Inject the record's share metadata into the SPA shell.
//
// If the fetched HTML still has the helmet placeholders (raw template), replace
// them in place. Otherwise the shell is the fully pre-rendered homepage: strip
// its existing overridable head tags first, then append ours before </head> so
// there is exactly one of each tag regardless of which shell we got.
//
// All replacements use the function form (or a template literal) so `$`
// sequences (`$$`, `$&`, `` $` ``, `$'`) in the injected title / meta — which
// escapeHtml does NOT neutralize — are inserted literally and cannot inject
// markup into the head.
//
// metaTags already opens with the <title> element, so the title marker is
// simply removed rather than filled: it stands for a whole element (that is
// what pre-render.ts substitutes into it), and filling it with the escaped
// title as well left the record's name stranded as loose text in the head,
// ahead of the real element.
function injectHeadMeta(indexHtml: string, metaTags: string): string {
  if (indexHtml.includes('<!--helmet-meta-->')) {
    return indexHtml
      .replace('<!--helmet-title-->', () => '')
      .replace('<!--helmet-meta-->', () => metaTags);
  }
  const headEnd = indexHtml.indexOf('</head>');
  if (headEnd !== -1) {
    const head = stripOverriddenHeadTags(indexHtml.slice(0, headEnd));
    const rest = indexHtml.slice(headEnd);
    return `${head}${metaTags}\n${rest}`;
  }
  return indexHtml;
}

// Fetches the built index.html to use as a shell. The request is constructed
// fresh rather than from `request` as init: inheriting the incoming request
// would also inherit its AbortSignal, which nothing here needs and which fails
// the cross-realm instanceof check under vitest.
async function fetchIndexHtml(request: Request, env: Env): Promise<string | null> {
  const indexRequest = new Request(new URL('/', request.url).toString(), { method: 'GET' });
  const indexResponse = await env.ASSETS.fetch(indexRequest);
  if (!indexResponse.ok) return null;
  return indexResponse.text();
}

// How a meta fallback behaves when it is the second resort, after an edge
// render that failed (see serveEdgePage): a shorter wait on the API, which has
// just failed to answer once, and a shorter browser TTL, so the reader gets the
// real page soon after the API recovers.
interface MetaFallbackOptions {
  timeoutMs?: number;
  cacheControl?: string;
}

function metaHtmlResponse(html: string, cacheControl = 'public, max-age=300'): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': cacheControl,
      ...securityHeaders(),
    },
  });
}

// The SPA shell at 404. Used when the API positively reports that a detail
// record does not exist — a renamed case slug, a deleted article. React Router
// renders NotFound from this body; only the status line differs. 410 for a URL
// that is gone for good (legacy numeric entity pages).
async function notFoundShellResponse(request: Request, env: Env, status: 404 | 410 = 404): Promise<Response | null> {
  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;
  return new Response(indexHtml, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      ...securityHeaders(),
    },
  });
}

// Inject share metadata for a published case not yet captured by pre-render.
async function handleCaseMetaFallback(
  request: Request,
  env: Env,
  slug: string,
  fallback: MetaFallbackOptions = {},
): Promise<Response | null> {
  const apiResponse = await fetchWithTimeout(
    `${JDS_API_BASE}/cases/${encodeURIComponent(slug)}/`,
    'follow',
    fallback.timeoutMs,
  );
  if (!apiResponse) return null;
  // Case slugs get renamed, and the old URL stays in circulation. The API
  // saying 404 is a positive answer, unlike a timeout.
  if (apiResponse.status === 404) return notFoundShellResponse(request, env);
  if (!apiResponse.ok) return null;

  let caseData: Record<string, unknown>;
  try {
    caseData = (await apiResponse.json()) as Record<string, unknown>;
  } catch {
    return null;
  }

  const titleRaw = String(caseData.title || 'Jawafdehi Case');
  // Shared with CaseDetail.tsx so a case served from here and the same case
  // served from its pre-rendered file carry the same description. Note this is
  // where `short_description` entered the chain: 379 of 463 published cases have
  // neither `description` nor `key_allegations`, so the old ending gave all of
  // them the identical generic sentence.
  const description = caseMetaDescription({
    description: typeof caseData.description === 'string' ? caseData.description : null,
    short_description:
      typeof caseData.short_description === 'string' ? caseData.short_description : null,
    key_allegations: Array.isArray(caseData.key_allegations)
      ? caseData.key_allegations.map((item) => String(item ?? ''))
      : null,
  });
  const canonicalSlug = typeof caseData.slug === 'string' && caseData.slug.trim() ? caseData.slug : slug;
  // Trailing slash: case pages are pre-rendered to /case/<slug>/index.html, so
  // the slashless form 307s. This branch serves the cases published since the
  // last build, which answer 200 either way — but it must still name the URL the
  // pre-rendered copy lives at, or the same case advertises two canonicals
  // depending on which path served it.
  const canonicalUrl = `${SITE_URL}/case/${encodeURIComponent(canonicalSlug)}/`;
  const imageUrl =
    previewImageUrl(caseData.banner_url as string | null | undefined, MEDIA_BASE) ||
    previewImageUrl(caseData.thumbnail_url as string | null | undefined, MEDIA_BASE) ||
    SOCIAL_IMAGE_URL;

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

  const metaTags = buildMetaTags({
    // Shared with CaseDetail.tsx, like the description: see caseMetaTitle.
    title: caseMetaTitle({
      title: titleRaw,
      title_en: typeof caseData.title_en === 'string' ? caseData.title_en : null,
      court_cases: Array.isArray(caseData.court_cases) ? caseData.court_cases.map(String) : null,
    }),
    description,
    canonicalUrl,
    imageUrl,
    imageAlt: titleRaw,
    type: 'article',
    publishedTime: typeof caseData.created_at === 'string' ? caseData.created_at : null,
    modifiedTime: typeof caseData.updated_at === 'string' ? caseData.updated_at : null,
    // IN_REVIEW cases are served by direct slug but are "unlisted": keep them
    // out of search engines (only PUBLISHED is indexable). Share cards still work.
    robots: caseData.state === 'PUBLISHED' ? null : 'noindex, nofollow',
  });
  return metaHtmlResponse(injectHeadMeta(indexHtml, metaTags), fallback.cacheControl);
}

// Inject share metadata for a CMS update/news article not yet pre-rendered.
async function handleUpdateMetaFallback(request: Request, env: Env, slug: string, basePath = '/updates'): Promise<Response | null> {
  const apiResponse = await fetchWithTimeout(
    `${CMS_API_BASE}/pages/?type=content.ArticlePage&slug=${encodeURIComponent(slug)}&fields=*`,
  );
  if (!apiResponse) return null;
  if (!apiResponse.ok) return null;

  let article: Record<string, unknown> | undefined;
  try {
    const payload = (await apiResponse.json()) as { items?: Array<Record<string, unknown>> };
    article = payload.items?.[0];
  } catch {
    return null;
  }
  // The CMS answers an unknown slug with 200 and an empty list, which is a
  // positive "no such article" — serve a real 404 rather than the shell.
  if (!article) return notFoundShellResponse(request, env);

  const titleRaw = String(article.title || 'Jawafdehi Update');
  const description = truncateMeta(
    stripHtml(typeof article.excerpt === 'string' ? article.excerpt : '') ||
    `An update from ${SITE_NAME}.`,
  );
  const canonicalUrl = `${SITE_URL}${basePath}/${encodeURIComponent(slug)}`;
  // The social rendition has to be picked HERE, not only in <Seo>: an unfurler
  // never runs the React app, so this worker-injected head is the only one it
  // sees. `og_image` is a 1200x630 JPEG — the ratio unfurlers want, and not the
  // WebP that LinkedIn/WhatsApp handle unreliably. `thumbnail` is the 16:9 WebP
  // card rendition, kept only as the fallback for an article the API hasn't
  // generated an og_image for.
  const social = (article.og_image ?? article.thumbnail) as
    | { url?: string; alt?: string; width?: number; height?: number }
    | null
    | undefined;
  const imageUrl = previewImageUrl(social?.url, MEDIA_BASE) || SOCIAL_IMAGE_URL;
  const usingArticleImage = imageUrl !== SOCIAL_IMAGE_URL;
  const meta = article.meta as { first_published_at?: string | null } | undefined;
  const date = typeof article.date === 'string' ? article.date : null;

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

  const metaTags = buildMetaTags({
    title: `${titleRaw} | Jawafdehi`,
    description,
    canonicalUrl,
    imageUrl,
    imageAlt: social?.alt || titleRaw,
    imageWidth: usingArticleImage ? social?.width : undefined,
    imageHeight: usingArticleImage ? social?.height : undefined,
    type: 'article',
    publishedTime: meta?.first_published_at || date,
    modifiedTime: date,
  });
  return metaHtmlResponse(injectHeadMeta(indexHtml, metaTags));
}

// How long a moved material's 301 is cached, at the edge and in browsers. A
// day, matching the API's own redirect: long enough that a popular old link
// costs one API call a day, short enough that moving a document BACK (a
// correction must stay reversible) does not leave readers looping for long.
const MATERIAL_MOVED_TTL_SECONDS = 86400;

// A re-filed material: the API 301s its old address to the current one
// (`Location: /api/materials/<source>/<ident>`). Turn that into a 301 between
// the matching site pages, keeping the reader's query string. Returns null for a
// Location that is not a material address, so the caller falls through to the
// shell rather than sending anyone somewhere unexpected.
function movedMaterialResponse(
  request: Request,
  tail: string,
  apiResponse: Response,
): Response | null {
  const location = apiResponse.headers.get('Location');
  if (!location) return null;
  let path: string;
  try {
    path = new URL(location, JDS_API_BASE).pathname;
  } catch {
    return null;
  }
  const prefix = '/api/materials/';
  if (!path.startsWith(prefix)) return null;
  let movedTail: string;
  try {
    movedTail = path
      .slice(prefix.length)
      .replace(/\/+$/, '')
      .split('/')
      .map(decodeURIComponent)
      .join('/');
  } catch {
    return null;
  }
  // Same gate as the incoming splat: the target becomes a URL on our origin.
  if (!isMaterialTail(movedTail) || movedTail === tail) return null;
  const target = new URL(`/material/${encodeMaterialTail(movedTail)}`, request.url);
  target.search = new URL(request.url).search;
  return new Response(null, {
    status: 301,
    headers: {
      Location: target.toString(),
      'Cache-Control': `public, max-age=${MATERIAL_MOVED_TTL_SECONDS}`,
    },
  });
}

// Inject share metadata and JSON-LD for a material page.
//
// Unlike cases and updates, this is not a gap-filler for records published since
// the last build — it is the ONLY head a material page has. There are 346,250
// materials against Cloudflare's ceiling of 20,000 static asset files per Worker
// version, so none of them is pre-rendered and none can be.
//
// What that meant in practice, measured on production 2026-10-13: every
// /material/* URL served dist/index.html verbatim — 278 KB whose <title> and
// og:title were the site-wide "Jawafdehi Initiative — Nepal's Corruption Case
// Archive" and which contained none of the document's text. 346,250 URLs serving
// byte-identical homepage content is a duplicate-content signal, not a neutral
// starting point.
//
// The head is built by @/lib/material-meta, the same module MaterialProfile.tsx
// renders from, so the head a crawler reads here and the head a browser gets
// after hydration cannot drift.
async function handleMaterialMetaFallback(
  request: Request,
  env: Env,
  tail: string,
  fallback: MetaFallbackOptions = {},
): Promise<Response | null> {
  // `/material/*` matches at any depth, so the splat is attacker-controlled and
  // is checked BEFORE it reaches a URL. See isMaterialTail: without this,
  // /material/..%2Fcases%2F<slug> normalises into a different API endpoint and
  // renders an unrelated record into the head.
  if (!isMaterialTail(tail)) return notFoundShellResponse(request, env);

  // A re-filed document's old address answers from the edge cache once it has
  // been seen (see movedMaterialResponse); nothing else on this path is cached.
  const cache = caches.default;
  const cachedMove = await cache.match(request);
  if (cachedMove) return cachedMove;

  // `manual`, not the default `follow`: the API 301s a retired material address
  // to the document's current one, and following it silently would render the
  // moved document's head here under the OLD canonical.
  const apiResponse = await fetchWithTimeout(
    `${JDS_API_BASE}/materials/${encodeMaterialTail(tail)}/`,
    'manual',
    fallback.timeoutMs,
  );
  if (!apiResponse) return null;
  if (apiResponse.status === 301 || apiResponse.status === 308) {
    const moved = movedMaterialResponse(request, tail, apiResponse);
    if (!moved) return null;
    if (request.method === 'GET') await cache.put(request, moved.clone());
    return moved;
  }
  // A positive "no such material" — a retired ident, a soft-deleted row, or one
  // whose visibility is no longer LISTED. Unlike a timeout, that is an answer.
  if (apiResponse.status === 404) return notFoundShellResponse(request, env);
  if (!apiResponse.ok) return null;

  let material: MaterialMetaSource;
  try {
    material = (await apiResponse.json()) as MaterialMetaSource;
  } catch {
    return null;
  }

  const displayName = materialDisplayName(material, tail);
  const typeLabel = materialTypeLabel(material);
  const description = materialMetaDescription(material, displayName, typeLabel);

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

  const metaTags = buildMetaTags({
    title: materialMetaTitle(displayName),
    description,
    canonicalUrl: materialCanonicalUrl(tail),
    // The document's own composed card (its kind, its title, an invitation
    // into the archive), never the site banner: every material used to unfurl
    // identically. The card route falls back to the banner by itself when the
    // API cannot answer, so this URL is always an image.
    imageUrl: materialCardUrl(tail),
    imageAlt: displayName,
    imageWidth: MATERIAL_CARD_WIDTH,
    imageHeight: MATERIAL_CARD_HEIGHT,
    type: 'article',
    publishedTime:
      typeof material.datePublished === 'string' ? material.datePublished : null,
    // noindex unless the API has cleared this document for search — which is
    // NOT the same as it being public (LISTED). A public document can still be
    // one the archive chooses not to push into Google. Fails closed; see
    // materialRobots for why this no longer reads jawafdehi:visibility.
    robots: materialRobots(material),
  });

  // The JSON-LD goes in as well as the meta tags. A material IS a schema.org
  // document — it is stored as JSON-LD — so this is the one page type where the
  // structured data is the record rather than a summary of it.
  //
  // materialJsonLd escapes `<` itself, so this is safe to interpolate into a
  // script element as-is; MaterialProfile.tsx relies on the same guarantee.
  const jsonLd = materialJsonLd(material, displayName, materialDescriptionText(material));
  const head = `${metaTags}\n    <script type="application/ld+json">${jsonLd}</script>`;

  return metaHtmlResponse(injectHeadMeta(indexHtml, head), fallback.cacheControl);
}

// The author's composed share card, proxied from the platform API.
//
// Served under THIS origin rather than linking crawlers straight at
// api.jawafdehi.org for two reasons. The og:image URL stays on jawafdehi.org, so
// it is covered by this site's robots.txt rather than a managed one that may
// disallow the crawlers we want (the same problem that already blocks scrapers
// on other hosts). And the URL shape is ours, so where the bytes come from can
// change later without invalidating cards already cached by every chat app a
// link was shared into.
//
// Cached for a day at the edge, which is the window a profile edit takes to show
// up. If the API cannot answer, this redirects to the static site banner instead
// of serving an error: an unfurler that gets a non-image for og:image shows NO
// image, which is worse than a generic one.
async function handleAuthorCard(request: Request, slug: string): Promise<Response> {
  return handleComposedCard(
    request,
    `${JDS_API_BASE}/authors/${encodeURIComponent(slug)}/og-card.jpg`,
  );
}

// A document's composed share card, proxied exactly as the author card is.
//
// `/assets/og/material/*` matches at any depth, so the splat is checked with
// isMaterialTail before it reaches a URL, for the same reason the material
// head fallback checks it: `..` segments would otherwise normalise into a
// different API endpoint. A bad tail gets the banner, not an error — it is
// still an og:image URL, and an unfurler shown a non-image shows nothing.
async function handleMaterialCard(request: Request, tail: string): Promise<Response> {
  if (!isMaterialTail(tail)) {
    return new Response(null, {
      status: 302,
      headers: { Location: SOCIAL_IMAGE_URL, 'Cache-Control': 'no-store' },
    });
  }
  return handleComposedCard(
    request,
    `${JDS_API_BASE}/materials/${encodeMaterialTail(tail)}/og-card.jpg`,
  );
}

// Shared by both cards: edge-cached for a day on success, the static banner on
// any failure.
async function handleComposedCard(request: Request, upstreamUrl: string): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const upstream = await fetchImageWithTimeout(upstreamUrl);

  if (!upstream || !upstream.ok) {
    // 404 (no such public author) and 503 (the API cannot shape the name) both
    // land here. Not cached: a slug can become real, and a 503 is transient.
    return new Response(null, {
      status: 302,
      headers: { Location: SOCIAL_IMAGE_URL, 'Cache-Control': 'no-store' },
    });
  }

  const response = new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': `public, max-age=${AUTHOR_CARD_TTL_SECONDS}`,
    },
  });
  // Only successful GETs are cached: Cloudflare's cache.put throws on any other
  // method, and these routes also answer HEAD. The clone is required: the body
  // is a stream and can be read once.
  if (request.method === 'GET') await cache.put(request, response.clone());
  return response;
}

// Inject share metadata for an author page.
//
// Author pages are not pre-rendered — and unlike cases and updates they had no
// fallback either, so /author/<slug> served the bare shell and every author
// unfurled as the site banner, with og:url pointing at the homepage.
async function handleAuthorMetaFallback(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response | null> {
  const apiResponse = await fetchWithTimeout(
    `${JDS_API_BASE}/authors/${encodeURIComponent(slug)}/`,
  );
  if (!apiResponse) return null;
  // A profile that is not published 404s, same as an unknown slug. Both are a
  // positive "no such page", unlike a timeout.
  if (apiResponse.status === 404) return notFoundShellResponse(request, env);
  if (!apiResponse.ok) return null;

  let author: Record<string, unknown>;
  try {
    author = (await apiResponse.json()) as Record<string, unknown>;
  } catch {
    return null;
  }

  const name = String(author.display_name || slug).trim();
  const role = typeof author.title === 'string' ? author.title.trim() : '';
  const cases = Array.isArray(author.cases) ? author.cases.length : 0;
  // The description says what the page holds, which the name alone does not.
  // Unlike the card, this CAN carry the case count: it is rebuilt on every scrape
  // rather than baked into an image cached for a day.
  //
  // A count of zero is omitted rather than written out. Every roster member has a
  // profile — one is created on first credit and Gaurav Karki has one without
  // having authored anything yet — and "0 documented cases" reads as a reproach
  // in a share preview where the plain role does not.
  const who = role ? `${name} — ${role} at ${SITE_NAME}.` : `${name} at ${SITE_NAME}.`;
  const caseLine = cases === 1 ? ' 1 documented case.' : ` ${cases} documented cases.`;
  const description = truncateMeta(cases > 0 ? `${who}${caseLine}` : who);
  const canonicalSlug =
    typeof author.slug === 'string' && author.slug.trim() ? author.slug : slug;
  const canonicalUrl = `${SITE_URL}/author/${encodeURIComponent(canonicalSlug)}`;

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

  const metaTags = buildMetaTags({
    title: `${name} | Jawafdehi`,
    description,
    canonicalUrl,
    // Always the composed card, never the raw headshot: those are 504x504 WebP,
    // which unfurls unreliably on WhatsApp and LinkedIn, and a square in a
    // summary_large_image card is cropped to a band across the face.
    imageUrl: authorCardUrl(canonicalSlug),
    imageAlt: `${name} — ${SITE_NAME}`,
    imageWidth: AUTHOR_CARD_WIDTH,
    imageHeight: AUTHOR_CARD_HEIGHT,
    // A person, not an article: no published/modified time, and og:type profile
    // is what this is for.
    type: 'profile',
  });
  return metaHtmlResponse(injectHeadMeta(indexHtml, metaTags));
}

// --------------------------------------------------------------------------
// Edge SSR: record pages rendered on request, cached by Workers Cache
//
// /case/*, /entity/*, /material/*, /courtcase/* and /series/* are rendered
// here from the API when no pre-rendered file exists, so a crawler and a first paint get the
// whole page, not a shell. The rendering happens in the EdgePages entrypoint,
// and ONLY there, because that entrypoint is the one wrangler.toml puts Workers
// Cache in front of. This default entrypoint stays uncached on purpose (it
// carries redirects, 404s and per-route headers that must run every time), and
// hands record pages to EdgePages through ctx.exports, which goes through the
// cache: a hit returns the stored page without EdgePages running at all.
//
// Freshness: an hour at the edge, then stale-while-revalidate for 7 days, and
// purge-on-change from the API (/_cache/purge, below) as the real mechanism.
// Failure: on a timeout or API error EdgePages answers 5xx, so the cache keeps
// serving its last good copy (stale-if-error, 7 days); with no copy at all,
// serveEdgePage falls back to the meta-injection shell this Worker served before
// edge SSR existed. A reader never gets a 5xx from a slow API.
//
// CPU: one render is ~25 ms (measured, JAW-80), over the Workers Free plan's
// 10 ms. Workers Paid bills CPU time only, never time spent waiting on the API.
// --------------------------------------------------------------------------

const DEFAULT_EDGE_API_TIMEOUT_MS = 4000;
const DEFAULT_EDGE_DEADLINE_MS = 8000;
// After a render timed out, the meta fallback's own API call gets this long:
// the API has just failed to answer once, so do not wait another 4 s on it.
const FALLBACK_AFTER_TIMEOUT_MS = 1500;
// Retry-After on a record page served with no record data (see the 503 below).
const RECORD_UNAVAILABLE_RETRY_AFTER_SECONDS = 120;
// Purge bodies are a list of at most 100 short tags.
const MAX_PURGE_BODY_BYTES = 16 * 1024;

// Headers EdgePages sets for the cache or for the gateway, never for a browser.
const EDGE_INTERNAL_HEADERS = ['Cache-Tag', 'Cloudflare-CDN-Cache-Control', 'X-Edge-SSR-Reason'];

function edgeSsrEnabled(env: Env): boolean {
  return (env.EDGE_SSR ?? '').trim().toLowerCase() !== 'off';
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function edgeMarker(status: number, marker: string, reason?: string): Response {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Edge-SSR': marker };
  // Bounded and on one line: it is read by the gateway's log, nothing else.
  if (reason) headers['X-Edge-SSR-Reason'] = reason.replace(/[\r\n]+/g, ' ').slice(0, 300);
  return new Response(null, { status, headers });
}

// Render a crawlable search listing for EdgePages. A 200 is cached like a record
// page (an hour, then stale-while-revalidate), which is also how a newly
// published case reaches the listing: there is no single record to purge on.
// Anything else is a marker the gateway reads as "serve the pre-rendered shell".
async function handleListingRender(url: URL, env: Env, ctx?: WorkerContext): Promise<Response> {
  const outcome = await renderEdgeListing(edgeBundle, `${url.pathname}${url.search}`, {
    apiTimeoutMs: positiveInt(env.EDGE_SSR_API_TIMEOUT_MS, DEFAULT_EDGE_API_TIMEOUT_MS),
    deadlineMs: positiveInt(env.EDGE_SSR_DEADLINE_MS, DEFAULT_EDGE_DEADLINE_MS),
    token: edgeApiTokenNoWait(env, ctx?.waitUntil ? (p) => ctx.waitUntil?.(p) : undefined),
    edgeSecret: env.EDGE_SSR_API_SECRET?.trim() || null,
  });
  if (outcome.kind === 'ok') {
    return new Response(outcome.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': CACHE_CONTROL_BROWSER,
        'Cloudflare-CDN-Cache-Control': EDGE_CDN_CACHE_CONTROL,
        // One tag for every listing page, so they can be purged together.
        'Cache-Tag': 'listing',
        'X-Edge-SSR': 'render',
      },
    });
  }
  const reason = 'reason' in outcome ? outcome.reason : outcome.kind;
  console.warn('[edge-ssr] listing not rendered', url.pathname + url.search, reason);
  return edgeMarker(outcome.kind === 'timeout' ? 504 : 503, outcome.kind === 'timeout' ? 'timeout' : 'error', reason);
}

// The cached side. Everything this returns with a 200 or a 301 is stored by
// Workers Cache under the request's path (the host is NOT part of the key:
// jawafdehi.org and jawafdehi.org.np share one copy, which is why nothing here
// may depend on the host — the site variant is chosen client-side).
async function handleEdgePageRequest(request: Request, env: Env, ctx?: WorkerContext): Promise<Response> {
  const url = new URL(request.url);
  if (normalizePath(url.pathname) === '/_cache/purge') return handleCachePurge(request, env, ctx);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  const sitemapPath = sitemapUpstreamPath(url.pathname, url.search);
  if (sitemapPath) return handleSitemap(sitemapPath);

  // A crawlable search listing. The inner request already carries the
  // normalised listingPath, so the cache keys one copy per (type, page).
  const listing = crawlableListing(url.pathname, url.search);
  if (listing) return handleListingRender(url, env, ctx);

  const matched = matchRoute(url.pathname);
  const kind = edgeKindForRoute(matched?.path);
  if (!matched || !kind) return edgeMarker(404, 'not-found', 'not an edge-rendered route');
  const tail = routeTail(kind, matched.params);
  // `/material/*` takes any depth, so the splat is attacker-controlled; the same
  // gate as handleMaterialMetaFallback, applied before it becomes an API path.
  if (!tail || (kind === 'material' && !isMaterialTail(tail))) return edgeMarker(404, 'not-found');

  const outcome = await renderEdgePage(edgeBundle, kind, tail, normalizePath(url.pathname), {
    apiTimeoutMs: positiveInt(env.EDGE_SSR_API_TIMEOUT_MS, DEFAULT_EDGE_API_TIMEOUT_MS),
    deadlineMs: positiveInt(env.EDGE_SSR_DEADLINE_MS, DEFAULT_EDGE_DEADLINE_MS),
    // Never wait on a token mint: see edgeApiTokenNoWait.
    token: edgeApiTokenNoWait(env, ctx?.waitUntil ? (p) => ctx.waitUntil?.(p) : undefined),
    edgeSecret: env.EDGE_SSR_API_SECRET?.trim() || null,
  });

  switch (outcome.kind) {
    case 'ok':
      return new Response(outcome.html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': CACHE_CONTROL_BROWSER,
          'Cloudflare-CDN-Cache-Control': EDGE_CDN_CACHE_CONTROL,
          'Cache-Tag': (await pageTags(kind, outcome.tails)).join(','),
          'X-Edge-SSR': 'render',
        },
      });
    case 'moved':
      // Relative on purpose: the cached copy is shared by every host.
      return new Response(null, {
        status: 301,
        headers: {
          Location: outcome.location,
          'Cache-Control': `public, max-age=${MATERIAL_MOVED_TTL_SECONDS}`,
          'Cache-Tag': (await pageTags(kind, [tail])).join(','),
          'X-Edge-SSR': 'moved',
        },
      });
    case 'not_found':
      return edgeMarker(404, 'not-found');
    case 'timeout':
      console.warn('[edge-ssr] render timed out', url.pathname, outcome.reason);
      return edgeMarker(504, 'timeout', outcome.reason);
    case 'error':
      console.warn('[edge-ssr] render failed', url.pathname, outcome.reason);
      return edgeMarker(503, 'error', outcome.reason);
  }
}

// The request body as text, or null once it passes `maxBytes`. Read in chunks
// and cancelled at the limit, because the route is reachable before the
// signature is checked: a chunked upload with no Content-Length must not be
// buffered whole just to be refused.
async function readBodyLimited(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

// A sitemap from the API, cached like a page (see worker/sitemap.ts). On any
// upstream failure: 5xx, so the cache keeps serving its last good copy.
async function handleSitemap(upstreamPath: string): Promise<Response> {
  const upstream = await fetchWithTimeout(`${API_ORIGIN}${upstreamPath}`, 'follow', SITEMAP_FETCH_TIMEOUT_MS);
  const type = upstream?.headers.get('Content-Type') ?? '';
  if (!upstream?.ok || !/xml/i.test(type)) {
    console.warn('[edge-ssr] sitemap fetch failed', upstreamPath, upstream?.status ?? 'no response');
    if (upstream?.status === 404) return edgeMarker(404, 'not-found');
    return edgeMarker(503, 'error', `sitemap upstream ${upstream?.status ?? 'timeout'}`);
  }
  let body = withCanonicalSlashes(await upstream.text());
  if (upstreamPath.startsWith('/sitemap.xml')) body = withSiteSitemap(body);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SITEMAP_BROWSER_CACHE_CONTROL,
      'Cloudflare-CDN-Cache-Control': SITEMAP_CDN_CACHE_CONTROL,
      'Cache-Tag': 'sitemap,ssr:all',
      'X-Edge-SSR': 'sitemap',
    },
  });
}

// POST /_cache/purge from the API's case_events edge-purge consumer.
//
// Runs inside EdgePages because a Workers Cache purge only reaches the cache of
// the entrypoint that calls it. POST is never cached, so this always runs.
async function handleCachePurge(request: Request, env: Env, ctx?: WorkerContext): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  const secret = env.CACHE_PURGE_SECRET?.trim();
  if (!secret) return jsonResponse({ error: 'cache purge is not configured' }, 503, 0);

  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_PURGE_BODY_BYTES) return jsonResponse({ error: 'body too large' }, 413, 0);
  const body = await readBodyLimited(request, MAX_PURGE_BODY_BYTES);
  if (body === null) return jsonResponse({ error: 'body too large' }, 413, 0);

  const authentic = await verifyPurgeSignature({
    secret,
    timestamp: request.headers.get('X-Jawafdehi-Timestamp'),
    signature: request.headers.get('X-Jawafdehi-Signature'),
    body,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  if (!authentic) return jsonResponse({ error: 'bad or stale signature' }, 401, 0);

  const parsed = parsePurgeBody(body);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400, 0);
  if (!ctx?.cache) return jsonResponse({ error: 'Workers Cache is not available here' }, 501, 0);

  const result = await ctx.cache.purge({ tags: parsed.tags });
  if (!result.success) {
    // Rate-limited or failed: tell the caller to retry later (it redelivers).
    console.warn('[edge-ssr] cache purge failed', JSON.stringify(result.errors ?? []));
    return jsonResponse({ error: 'purge failed', errors: result.errors ?? [] }, 429, 0);
  }
  return jsonResponse({ ok: true, purged: parsed.tags.length }, 200, 0);
}

// The uncached side: hand a record page to EdgePages (through the cache), then
// turn its verdict into what the reader gets. Returns null when the caller
// should carry on to the meta-injection shell with `fallback` options.
async function serveEdgePage(
  request: Request,
  env: Env,
  ctx: WorkerContext | undefined,
  secHeaders: Record<string, string>,
): Promise<{ response: Response } | { fallback: MetaFallbackOptions; marker: string }> {
  const url = new URL(request.url);
  // Path only: the query string would split the cache (utm_*, fbclid) for no
  // difference in the rendered record. The browser re-renders with the real
  // URL anyway (createRoot, not hydration). No incoming headers either:
  // Authorization or Cookie on the forwarded request would make the cache
  // BYPASS, and nothing the page renders depends on them.
  // `redirect: 'manual'`: a `moved` verdict (a re-filed material, a superseded
  // case slug) is a 301 for the READER. Followed here, it was silently replaced
  // by a render of the target, served under the old URL as a 200 duplicate.
  const inner = new Request(new URL(normalizePath(url.pathname), url.origin).toString(), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: { Accept: 'text/html' },
    redirect: 'manual',
  });

  let res: Response;
  try {
    res = ctx?.exports?.EdgePages
      ? await ctx.exports.EdgePages.fetch(inner)
      : await handleEdgePageRequest(inner, env, ctx);
  } catch (err) {
    console.warn('[edge-ssr] EdgePages call failed', String((err as Error)?.message ?? err));
    return { fallback: { cacheControl: CACHE_CONTROL_FALLBACK }, marker: 'fallback-error' };
  }

  if (res.status === 200 || res.status === 301) {
    const response = new Response(res.body, res);
    for (const name of EDGE_INTERNAL_HEADERS) response.headers.delete(name);
    for (const [key, value] of Object.entries(secHeaders)) response.headers.set(key, value);
    return { response };
  }

  const marker = res.headers.get('X-Edge-SSR');
  if (res.status === 404 && marker === 'not-found') {
    const notFound = await notFoundShellResponse(request, env);
    if (notFound) return { response: notFound };
  }
  if (marker === 'timeout') {
    return {
      fallback: { timeoutMs: FALLBACK_AFTER_TIMEOUT_MS, cacheControl: CACHE_CONTROL_FALLBACK },
      marker: 'fallback-timeout',
    };
  }
  return { fallback: { cacheControl: CACHE_CONTROL_FALLBACK }, marker: 'fallback-error' };
}

export default {
  async fetch(request: Request, env: Env, ctx?: WorkerContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    // Endpoints the Worker owns are matched on the trailing-slash-normalised
    // path, the same form the route match below uses. Comparing against the raw
    // pathname let /api/latest-videos/ miss its handler and fall through to the
    // SPA shell, which answered 200 with HTML where the caller expected JSON.
    const endpoint = normalizePath(path);

    // Cache purges from the API. Handled inside EdgePages, whose cache it is.
    if (endpoint === '/_cache/purge') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
      return ctx?.exports?.EdgePages
        ? ctx.exports.EdgePages.fetch(request)
        : handleEdgePageRequest(request, env, ctx);
    }

    // Handle oEmbed endpoint
    if (endpoint === '/oembed') {
      return handleOembed(request);
    }

    if (endpoint === '/document-preview') {
      return handleDocumentPreview(request);
    }

    // Author share cards. Matched here, ahead of the assets binding, because the
    // Worker owns this path outright — nothing is committed under it, so letting
    // it fall through would spend a subrequest on a guaranteed 404 first.
    const authorCardMatch = endpoint.match(/^\/assets\/og\/author\/([^/]+)\.jpg$/);
    if (authorCardMatch) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      return handleAuthorCard(request, decodeURIComponent(authorCardMatch[1]));
    }

    // Document share cards, matched here for the same reason the author card
    // is. The tail is percent-decoded per segment, the inverse of
    // encodeMaterialTail, so a Devanagari ident reaches the API as itself.
    const materialCardMatch = endpoint.match(/^\/assets\/og\/material\/(.+)\.jpg$/);
    if (materialCardMatch) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      let tail: string;
      try {
        tail = materialCardMatch[1].split('/').map(decodeURIComponent).join('/');
      } catch {
        tail = '';
      }
      return handleMaterialCard(request, tail);
    }

    // Latest YouTube uploads for the Weekly Series "Past presentations" section
    if (endpoint === '/api/latest-videos') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      return handleLatestVideos(request);
    }

    // Which SPA route this path resolves to, if any. One match decides the frame
    // policy below, the detail-metadata fallbacks, and the final status line —
    // rather than three hand-written regexes each re-deciding it.
    const matched = matchRoute(path);

    // The case-embed widget and the Wagtail headless preview both render inside
    // an <iframe>, so neither can send X-Frame-Options: DENY. The embed widget
    // is framable anywhere; the preview (an unsaved draft) is scoped to the CMS
    // admin and marked noindex — see previewSecurityHeaders.
    const isEmbedRoute = matched?.path === '/embed/case/:id';
    const isPreviewRoute = matched?.path === '/updates/preview';
    const secHeaders = isPreviewRoute
      ? previewSecurityHeaders()
      : isEmbedRoute
        ? securityHeadersAllowFrame()
        : securityHeaders();

    // Routes SITE_ROUTES marks noindex — the admin panel and the non-public
    // standalone routes. Set here rather than in each branch because secHeaders
    // is applied to every response the Worker builds (pre-rendered asset, SPA
    // fallback and every redirect), so one assignment covers all of them.
    //
    // 🚨 This is the ONLY channel that works for these pages. They are served the
    // SPA shell with no per-route Helmet output, so a <meta name="robots"> in the
    // component never reaches a crawler — /admin shipped 241 KB with no title, no
    // meta robots and no header at all, and Google indexed it and spent ~70% of
    // its crawl budget there. The page deliberately keeps answering 200: a
    // robots.txt Disallow would stop the re-crawl that lets Google SEE the
    // noindex, which is what makes an already-indexed URL unremovable.
    if (matched && isNoindexPath(path)) {
      secHeaders['X-Robots-Tag'] = 'noindex, nofollow';
    }

    // The social card used to ship under two names. /og-favicon.png was the
    // original, kept byte-identical to /assets/social-preview.png purely so
    // shares already cached against the old filename kept resolving. The file is
    // gone now, so this 301 does that job instead: a scraper re-fetching an old
    // og:image URL still lands on the current card.
    //
    // This is only reachable because the file was deleted — the assets binding
    // answers before the Worker on any path it holds, so while og-favicon.png
    // existed this branch could never run.
    if (path === '/og-favicon.png') {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': '/assets/social-preview.png',
          'Cache-Control': 'public, max-age=86400',
          ...secHeaders,
        },
      });
    }

    // The retired browse pages → the typed archive search (301), query string
    // carried across. These were in the sitemap until they folded into /search;
    // a permanent redirect at the edge is what tells crawlers they MOVED (a 200
    // shell with a client-side <Navigate> reads as a duplicate instead), and it
    // keeps a bookmarked filter working without JavaScript.
    const retiredType = retiredBrowseType(endpoint);
    if (retiredType) {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': archiveSearchUrl(retiredType, url.search),
          'Cache-Control': 'public, max-age=86400',
          ...secHeaders,
        },
      });
    }

    // /whats-new folded into Updates & News, as its product updates — 301.
    if (endpoint === '/whats-new') {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': '/updates/?filter=product',
          'Cache-Control': 'public, max-age=86400',
          ...secHeaders,
        },
      });
    }

    // Short alias: /weekly → /saptahik (301)
    if (endpoint === '/weekly') {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': '/saptahik' + url.search,
          'Cache-Control': 'public, max-age=3600',
          ...secHeaders,
        },
      });
    }

    // Research moved to its own site, research.jawafdehi.org, and the in-app
    // report page was removed. The section's old addresses — the bare /research
    // people type, and the report's own URL — 301 there, query string carried
    // (so a reel's ?utm_source still arrives). Permanent: the section does not
    // come back to this origin.
    if (endpoint === '/research' || endpoint === '/research/corruption-accountability') {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': RESEARCH_URL + '/' + url.search,
          'Cache-Control': 'public, max-age=86400',
          ...secHeaders,
        },
      });
    }

    // Handle legacy numeric case redirects (301)
    //
    // Target carries the trailing slash the pre-rendered page is published at,
    // because otherwise this 301 lands on a
    // URL that immediately 307s, so /case/212 cost two hops and the middle one
    // named a redirecting URL as its canonical. Search Console counted that as
    // "Duplicate, Google chose different canonical than user" on 16 URLs.
    const caseMatch = path.match(/^\/case\/(\d+)\/?$/);
    if (caseMatch) {
      const legacyId = caseMatch[1];
      const targetSlug = LEGACY_CASE_MAP[legacyId];
      if (targetSlug) {
        return new Response(null, {
          status: 301,
          headers: {
            'Location': `/case/${targetSlug}/`,
            'Cache-Control': 'public, max-age=3600',
            ...secHeaders,
          },
        });
      }
    }

    // Legacy numeric entity URLs (/entity/<id>), retired with the JawafEntity
    // table in July 2026. Google still holds ~90 of them, as 404s and soft 404s.
    // An ID whose entity can be identified today 301s to its page; the rest are
    // 410, which tells Google the page is gone for good rather than missing.
    // See src/utils/legacyEntityMap.ts for how the mapping was made.
    const legacyEntityMatch = path.match(/^\/entity\/(\d+)\/?$/);
    if (legacyEntityMatch) {
      const target = LEGACY_ENTITY_MAP[legacyEntityMatch[1]];
      if (target) {
        return new Response(null, {
          status: 301,
          headers: { 'Location': target, 'Cache-Control': 'public, max-age=86400', ...secHeaders },
        });
      }
      const gone = await notFoundShellResponse(request, env, 410);
      if (gone) return gone;
    }

    // Court-case-ref case URLs: /case/081-CR-0116 → canonical slug (301)
    // Slash-terminated for the same reason as the numeric redirect above.
    const courtRefMatch = path.match(/^\/case\/(\d+-[A-Za-z]+-\d+)\/?$/);
    if (courtRefMatch) {
      const targetSlug = await resolveCourtRefSlug(courtRefMatch[1]);
      if (targetSlug) {
        return new Response(null, {
          status: 301,
          headers: {
            'Location': `/case/${targetSlug}/`,
            'Cache-Control': 'public, max-age=3600',
            ...secHeaders,
          },
        });
      }
    }

    // Case, entity and series pages: slashless → slashed (301).
    //
    // Their canonical URL ends in a slash (CaseDetail's and EntityRecordProfile's
    // canonical, the sitemap, the legacy redirects above). While the build
    // pre-rendered them to <path>/index.html the assets binding 307'd the
    // slashless form; nothing is pre-rendered for them any more (the edge renders
    // them, see "Edge SSR" above), so this does that job, permanently, and
    // without rendering the page twice under two cache keys.
    //
    // /material/* and /courtcase/* are canonical WITHOUT a slash and are left
    // alone. The Location is rebuilt from a single leading slash so that a
    // `//case/x` path cannot turn into a protocol-relative redirect off-site.
    if (
      (matched?.path === '/case/:id' ||
        matched?.path === '/entity/*' ||
        matched?.path === '/series/:slug') &&
      !path.endsWith('/') &&
      (request.method === 'GET' || request.method === 'HEAD')
    ) {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': `/${path.replace(/^\/+/, '')}/${url.search}`,
          'Cache-Control': 'public, max-age=86400',
          ...secHeaders,
        },
      });
    }

    // Sitemaps come from the API through the cached EdgePages entrypoint.
    // /sitemap-site.xml, the site's own pages, is a static asset and never
    // reaches here: the assets binding answers first.
    const sitemapPath = sitemapUpstreamPath(path, url.search);
    if (sitemapPath && (request.method === 'GET' || request.method === 'HEAD')) {
      const inner = new Request(new URL(sitemapPath, url.origin).toString(), {
        method: request.method,
        headers: { Accept: 'application/xml' },
      });
      const res = ctx?.exports?.EdgePages
        ? await ctx.exports.EdgePages.fetch(inner)
        : await handleEdgePageRequest(inner, env, ctx);
      if (res.status === 200) {
        const response = new Response(res.body, res);
        for (const name of EDGE_INTERNAL_HEADERS) response.headers.delete(name);
        return response;
      }
      return new Response(res.status === 404 ? 'Not Found' : 'Sitemap temporarily unavailable', {
        status: res.status === 404 ? 404 : 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '300', 'Content-Type': 'text/plain' },
      });
    }

    // Crawlable search listings, rendered at the edge AHEAD of the assets
    // binding. /search/ is pre-rendered, so without this the binding answers
    // every /search URL — ?type=case&page=3 included — with the same static
    // page: no results, no record links, nothing for a crawler to walk. Only
    // the unfiltered listing of one record type qualifies
    // (lib/crawlable-listing.ts); everything else gets the pre-rendered page
    // exactly as before, and a listing that fails to render gets it as a 503.
    const listing = crawlableListing(path, url.search);
    if (listing && edgeSsrEnabled(env) && (request.method === 'GET' || request.method === 'HEAD')) {
      const inner = new Request(new URL(listingPath(listing), url.origin).toString(), {
        method: request.method,
        headers: { Accept: 'text/html' },
        redirect: 'manual',
      });
      let res: Response | null = null;
      try {
        res = ctx?.exports?.EdgePages
          ? await ctx.exports.EdgePages.fetch(inner)
          : await handleEdgePageRequest(inner, env, ctx);
      } catch (err) {
        console.warn('[edge-ssr] listing call failed', String((err as Error)?.message ?? err));
      }
      if (res?.status === 200) {
        const response = new Response(res.body, res);
        for (const name of EDGE_INTERNAL_HEADERS) response.headers.delete(name);
        for (const [key, value] of Object.entries(secHeaders)) response.headers.set(key, value);
        return response;
      }
      // The render failed or led nowhere. The pre-rendered /search page still
      // goes out, so a reader's browser loads the listing itself, but as a 503
      // that is never cached: a 200 here would hand a crawler an empty page
      // that names itself canonical once its script runs (as #533 does for
      // record pages).
      const shell = await env.ASSETS.fetch(request);
      if (shell.status === 200) {
        const response = new Response(shell.body, { status: 503, headers: shell.headers });
        for (const [key, value] of Object.entries(secHeaders)) response.headers.set(key, value);
        response.headers.set('Cache-Control', 'no-store');
        response.headers.set('Retry-After', '120');
        if (res) {
          const marker = res.headers.get('X-Edge-SSR');
          if (marker) response.headers.set('X-Edge-SSR', marker);
        }
        return response;
      }
    }

    // Try to serve pre-rendered static asset
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) {
      const response = new Response(asset.body, asset);
      for (const [key, value] of Object.entries(secHeaders)) {
        response.headers.set(key, value);
      }
      return response;
    }

    // SPA fallback. Everything below is a path ASSETS does not hold.
    if (request.method !== 'GET' && request.method !== 'HEAD') return asset;

    // Case pages are not pre-rendered at all (the edge renders them) and update
    // articles published after the last build are not either, so the bare SPA
    // shell would share with generic metadata.
    // Inject the record's real Open Graph / Twitter tags so link previews are
    // correct on every platform. Numeric / court-ref case URLs are already
    // redirected to their canonical slug above, so only slugs reach here.
    //
    // Gating on the matched route rather than a regex keeps sibling literal
    // routes out of it: /updates/preview is the Wagtail preview target, not an
    // article, and asking the CMS for an article named "preview" 404'd it.
    // Params come back percent-decoded.
    //
    // Record pages are rendered at the edge first (see serveEdgePage). Only when
    // that fails with nothing cached do they get the meta-injection shell below,
    // with a shorter API wait and a shorter browser TTL.
    let fallback: MetaFallbackOptions = {};
    let fallbackMarker: string | null = null;
    if (edgeKindForRoute(matched?.path) && edgeSsrEnabled(env)) {
      const edge = await serveEdgePage(request, env, ctx, secHeaders);
      if ('response' in edge) return edge.response;
      fallback = edge.fallback;
      fallbackMarker = edge.marker;
    }
    const markFallback = (response: Response): Response => {
      if (fallbackMarker) response.headers.set('X-Edge-SSR', fallbackMarker);
      return response;
    };

    if (matched?.path === '/case/:id' && matched.params.id) {
      const metaResponse = await handleCaseMetaFallback(request, env, matched.params.id, fallback);
      if (metaResponse) return markFallback(metaResponse);
    }
    if ((matched?.path === '/updates/:slug' || matched?.path === '/blog/:slug') && matched.params.slug) {
      const metaResponse = await handleUpdateMetaFallback(
        request,
        env,
        matched.params.slug,
        matched.path === '/blog/:slug' ? '/blog' : '/updates',
      );
      if (metaResponse) return metaResponse;
    }
    if (matched?.path === '/author/:slug' && matched.params.slug) {
      const metaResponse = await handleAuthorMetaFallback(request, env, matched.params.slug);
      if (metaResponse) return metaResponse;
    }
    // Materials are never pre-rendered (see handleMaterialMetaFallback), so this
    // is not a gap-filler like the three above — it is the only head these pages
    // get. The splat param carries `<source>/<ident>`, percent-decoded.
    if (matched?.path === '/material/*' && matched.params['*']) {
      const metaResponse = await handleMaterialMetaFallback(request, env, matched.params['*'], fallback);
      if (metaResponse) return markFallback(metaResponse);
    }

    const indexRequest = new Request(new URL('/', request.url).toString(), { method: 'GET' });
    const indexResponse = await env.ASSETS.fetch(indexRequest);

    // A path the SPA has no route for is a real 404, not a page. Serving the
    // shell at 200 made every typo and every dead link indexable, and told
    // link checkers the site had no broken links at all. The body is still the
    // shell so React Router renders the styled NotFound page — only the status
    // line changes, which is the part crawlers read.
    // A record page whose render AND meta fallback both failed (the API is slow
    // or down, nothing cached) has no record data at all, and the shell here is
    // the PRE-RENDERED HOMEPAGE: its title, description and `canonical=/`. At
    // 200 that told a crawler the case or entity was a duplicate of the home
    // page (seen on /case/rabi-lamichhane-… on 2026-11-24, byte-identical to /).
    // A 503 with Retry-After is the honest answer: search engines treat it as
    // temporary and keep the indexed copy, while a browser still renders the
    // body, so a reader gets the SPA, which loads the record itself.
    const recordUnavailable = Boolean(matched && fallbackMarker);
    const status = matched ? (recordUnavailable ? 503 : 200) : 404;
    // The shell is the pre-rendered HOMEPAGE, and its head says so: canonical=/
    // and og:url=/. Under any other path that was a false claim that the page
    // is a copy of the home page (/data-quality was served that way on
    // 2026-11-24). Drop the two URL claims; the SPA sets the page's own head
    // once it runs, and a crawler that renders JS reads that.
    const body =
      normalizePath(path) === '/' || !indexResponse.ok
        ? indexResponse.body
        : stripHomepageUrlClaims(await indexResponse.text());
    const spaResponse = new Response(body, {
      status,
      headers: indexResponse.headers,
    });
    if (body !== indexResponse.body) {
      // The asset's length and validator describe the unedited file.
      spaResponse.headers.delete('Content-Length');
      spaResponse.headers.delete('ETag');
    }
    for (const [key, value] of Object.entries(secHeaders)) {
      spaResponse.headers.set(key, value);
    }
    if (status === 404) {
      // Do not let a 404 sit in an edge or browser cache: the same path can
      // become real the moment a case is published.
      spaResponse.headers.set('Cache-Control', 'no-store');
      spaResponse.headers.set('X-Robots-Tag', 'noindex');
    } else if (recordUnavailable) {
      // Never cached: the next request should try the API again, not replay this.
      spaResponse.headers.set('Cache-Control', 'no-store');
      spaResponse.headers.set('Retry-After', String(RECORD_UNAVAILABLE_RETRY_AFTER_SECONDS));
      markFallback(spaResponse);
    }
    return spaResponse;
  },
};

// The cached entrypoint. wrangler.toml turns Workers Cache on for this one and
// off for the default export; see the Edge SSR section above.
export class EdgePages extends WorkerEntrypoint<Env> {
  async fetch(request: Request): Promise<Response> {
    return handleEdgePageRequest(request, this.env, this.ctx as unknown as WorkerContext);
  }
}
