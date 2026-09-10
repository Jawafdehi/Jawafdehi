import { LEGACY_CASE_MAP } from './src/utils/legacyCaseMap';
import { matchRoute, normalizePath } from './src/data/route-patterns';
import { courtRefCandidates } from './src/utils/courtCaseRef';
import { JAWAFDEHI_WEEKLY_SERIES } from './src/config/constants';
import {
  AUTHOR_CARD_HEIGHT,
  AUTHOR_CARD_WIDTH,
  SITE_NAME,
  SITE_URL,
  SOCIAL_IMAGE_URL,
  authorCardUrl,
  buildHeadTags,
  escapeHtml,
  previewImageUrl,
  renderHeadTagsToHtml,
  stripHtml,
  truncateMeta,
} from './src/utils/seo';
import { stripMarkdown } from './src/utils/markdown';
import {
  caseStructuredData,
  entityOgType,
  entityStructuredData,
} from './src/utils/structured-data';

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
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
const AUTHOR_CARD_TTL_SECONDS = 86400;

const DOCUMENT_PREVIEW_ALLOWED_HOSTS = new Set([
  'ngm-store.jawafdehi.org',
  's3.jawafdehi.org',
]);

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
  // Without these the SPA loads gtag/Sentry/RUM but the browser blocks every
  // request, so analytics silently record nothing and prod errors never reach Sentry.
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.jawafdehi.org https://portal.jawafdehi.org https://jawafdehi.org https://nes.jawafdehi.org https://auth.jawafdehi.org https://*.ingest.de.sentry.io https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://cloudflareinsights.com; worker-src 'self' blob:;",
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
async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), META_FETCH_TIMEOUT_MS);
  try {
    // Returned whatever the status, so callers can tell "the API says this
    // record does not exist" (404 → serve a real 404) apart from "the API did
    // not answer" (null → fall through to the shell rather than deindex a
    // live page over a slow backend).
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
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
  // Machine-readable twins of the page (JSON API record, oEmbed) and the
  // schema.org graph describing it. These are emitted HERE and not only in the
  // React tree because a case page is never pre-rendered (see
  // scripts/pre-render.ts): this injected head is the only one an agent sees.
  alternates?: Array<{ href: string; type?: string; title?: string; rel?: string }>;
  jsonLd?: unknown[];
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
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, () => '')
    // The shell is the pre-rendered HOMEPAGE, which carries the site-level
    // WebSite node with its SearchAction. Riding along on a case or entity URL it
    // is a second, irrelevant graph competing with the record's own — so it goes
    // and the injected nodes take its place. Scoped to ld+json by the `type`
    // attribute: the shell's other <script> tags are the module entry and the
    // dehydrated query state, and dropping either would break the page.
    //
    // `\s*=\s*` because HTML allows whitespace around an attribute's equals sign.
    // Helmet does not emit it, but a hand-edited index.html could, and a missed
    // node means two competing graphs rather than a visible error.
    //
    // Alternates are deliberately NOT stripped: the shell has none, and
    // rel="alternate" is also how hreflang pairs are expressed, so a blanket
    // strip here would be a trap for whoever adds those.
    .replace(
      /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
      () => '',
    );
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

function metaHtmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      ...securityHeaders(),
    },
  });
}

// The SPA shell at 404. Used when the API positively reports that a detail
// record does not exist — a renamed case slug, a deleted article. React Router
// renders NotFound from this body; only the status line differs.
async function notFoundShellResponse(request: Request, env: Env): Promise<Response | null> {
  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;
  return new Response(indexHtml, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      ...securityHeaders(),
    },
  });
}

// Inject share metadata for a published case not yet captured by pre-render.
async function handleCaseMetaFallback(request: Request, env: Env, slug: string): Promise<Response | null> {
  const apiResponse = await fetchWithTimeout(`${JDS_API_BASE}/cases/${encodeURIComponent(slug)}/`);
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
  const allegationText = Array.isArray(caseData.key_allegations)
    ? caseData.key_allegations.slice(0, 2).map((item) => String(item ?? '').trim()).filter(Boolean).join('. ')
    : '';
  const description = truncateMeta(
    stripMarkdown(stripHtml(typeof caseData.description === 'string' ? caseData.description : '')) ||
    allegationText ||
    `A verified corruption and misconduct case documented by ${SITE_NAME}.`,
  );
  const canonicalSlug = typeof caseData.slug === 'string' && caseData.slug.trim() ? caseData.slug : slug;
  const canonicalUrl = `${SITE_URL}/case/${encodeURIComponent(canonicalSlug)}`;
  const imageUrl =
    previewImageUrl(caseData.banner_url as string | null | undefined, MEDIA_BASE) ||
    previewImageUrl(caseData.thumbnail_url as string | null | undefined, MEDIA_BASE) ||
    SOCIAL_IMAGE_URL;

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

  const apiUrl = `${JDS_API_BASE}/cases/${encodeURIComponent(canonicalSlug)}/`;
  const metaTags = buildMetaTags({
    title: `${titleRaw} | Jawafdehi`,
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
    // The machine-readable twins. This page is not pre-rendered, so without
    // these an agent that lands on a case URL has no way to learn the JSON
    // record exists.
    alternates: [
      { href: apiUrl, type: 'application/json', title: 'Case data (JSON API)' },
      {
        href: `${SITE_URL}/oembed/?url=${encodeURIComponent(canonicalUrl)}&format=json`,
        type: 'application/json+oembed',
        title: `${titleRaw} oEmbed`,
      },
    ],
    jsonLd: caseStructuredData({
      canonicalUrl,
      title: titleRaw,
      description,
      imageUrl,
      datePublished:
        (typeof caseData.case_publish_date === 'string' ? caseData.case_publish_date : null) ??
        (typeof caseData.created_at === 'string' ? caseData.created_at : null),
      dateModified: typeof caseData.updated_at === 'string' ? caseData.updated_at : null,
      // Only real strings: mapping with String() turned a stray null in `tags[]`
      // into the keyword "null".
      tags: Array.isArray(caseData.tags)
        ? caseData.tags.filter((tag): tag is string => typeof tag === 'string')
        : undefined,
      entities: apiRecords(caseData.entities).map((entity) => ({
        display_name: typeof entity.display_name === 'string' ? entity.display_name : null,
        nes_id: typeof entity.nes_id === 'string' ? entity.nes_id : null,
        entity_type: typeof entity.entity_type === 'string' ? entity.entity_type : null,
        type: typeof entity.type === 'string' ? entity.type : null,
      })),
      authors: apiRecords(caseData.authors).map((author) => ({
        display_name: typeof author.display_name === 'string' ? author.display_name : null,
        slug: typeof author.slug === 'string' ? author.slug : null,
        has_public_page: author.has_public_page === true,
      })),
      apiUrl,
      caseType: typeof caseData.case_type === 'string' ? caseData.case_type : null,
    }),
  });
  return metaHtmlResponse(injectHeadMeta(indexHtml, metaTags));
}

// --------------------------------------------------------------------------
// Entity record pages
//
// Entity pages are not pre-rendered either — pre-render.ts collects entity IDs
// from `case.entities[].id`, a field the case serializer no longer returns (it
// keys binds on `nes_id`), so that loop has quietly rendered nothing. The result
// was that every /entity/<prefix>/<slug> URL served the SPA shell with the
// HOMEPAGE's head: an agent asking about an official got the site's own title,
// description and canonical, with no indication which entity the page was about.
//
// This is the same treatment cases get: fetch the record, inject its real head,
// and advertise the JSON twin. The entity's canonical NES IRI becomes the
// JSON-LD @id, so the identifier here is the same one that appears in every
// case's `about` — which is what lets an agent join the two.
// --------------------------------------------------------------------------

// Keep only the plain objects in a list the API is supposed to return records in.
//
// A `null` inside `entities[]` used to reach a property access and throw, and an
// uncaught throw here is not a missing tag — it is a 500 for the whole page. One
// malformed row would have taken down every case page. A row that cannot be read
// is dropped instead.
function apiRecords(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  );
}

// An entity IRI tail (`<prefix>/<slug>`), or null when the shape is not one.
//
// The tail is attacker-supplied and is interpolated into an upstream API path, so
// it is validated rather than merely encoded. `encodeURIComponent` does NOT touch
// dots, so a `..` segment would have survived into the upstream path; the slash
// between segments has to stay a real slash for the record endpoint to resolve, so
// there is no encoding that both works and is inherently safe. An allowlist is.
//
// Rejected: a `.`/`..` segment, an empty segment, anything outside the slug
// alphabet (which excludes NUL and every other control character), more segments
// than a real IRI tail has, and an absurd length. A rejected tail falls through to
// the SPA, which renders its own not-found.
const ENTITY_TAIL_SEGMENT = /^[A-Za-z0-9_.~-]+$/;
const MAX_ENTITY_TAIL_SEGMENTS = 6;
const MAX_ENTITY_TAIL_LENGTH = 200;

function entityTailSegments(tail: string): string[] | null {
  if (!tail || tail.length > MAX_ENTITY_TAIL_LENGTH) return null;
  const segments = tail.split('/');
  if (segments.length === 0 || segments.length > MAX_ENTITY_TAIL_SEGMENTS) return null;
  for (const segment of segments) {
    if (!ENTITY_TAIL_SEGMENT.test(segment)) return null;
    if (segment === '.' || segment === '..') return null;
  }
  return segments;
}

type Bilingual = { en?: string | null; ne?: string | null };

// A NES bilingual field, which arrives as a language map or a bare string.
function bilingualValue(value: unknown): Bilingual {
  if (typeof value === 'string') return { en: value, ne: value };
  if (value && typeof value === 'object') {
    const map = value as Record<string, unknown>;
    return {
      en: typeof map.en === 'string' ? map.en : null,
      ne: typeof map.ne === 'string' ? map.ne : null,
    };
  }
  return { en: null, ne: null };
}

// NES stores alternateName as a language map of arrays, an array, or a string.
function aliasList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => (Array.isArray(item) ? item : [item]))
      .filter((item): item is string => typeof item === 'string');
  }
  return [];
}

async function handleEntityMetaFallback(
  request: Request,
  env: Env,
  tail: string,
): Promise<Response | null> {
  // Validated, not merely encoded — see entityTailSegments. A tail that is not a
  // plausible IRI tail never reaches the API.
  const segments = entityTailSegments(tail);
  if (!segments) return null;
  // The record endpoint takes the IRI tail as real path segments, so the slash
  // between prefix and slug must survive; each segment is encoded individually.
  const encodedTail = segments.map(encodeURIComponent).join('/');
  const apiResponse = await fetchWithTimeout(`${JDS_API_BASE}/entities/${encodedTail}`);
  if (!apiResponse) return null;
  if (apiResponse.status === 404) return notFoundShellResponse(request, env);
  if (!apiResponse.ok) return null;

  let record: Record<string, unknown>;
  try {
    record = (await apiResponse.json()) as Record<string, unknown>;
  } catch {
    return null;
  }

  const name = bilingualValue(record.name);
  // English-first, matching EntityRecordProfile's own displayName, so the edge
  // head and the head the app renders on client-side navigation agree.
  const displayName = (name.en || name.ne || segments[segments.length - 1] || 'Entity').trim();
  const nameAlternate = name.en && name.ne && name.en !== displayName ? name.en : name.ne;
  const description = bilingualValue(record.description);
  const typeToken = typeof record['@type'] === 'string'
    ? record['@type']
    : Array.isArray(record['@type']) && typeof record['@type'][0] === 'string'
      ? (record['@type'][0] as string)
      : typeof record.additionalType === 'string'
        ? record.additionalType
        : null;

  const canonicalUrl = `${SITE_URL}/entity/${encodedTail}`;
  const metaDescription = truncateMeta(
    stripHtml(description.en || description.ne || '') ||
    `${displayName} in the ${SITE_NAME} public entity registry — every documented case, allegation and record involving this entity.`,
  );
  const apiUrl = `${JDS_API_BASE}/entities/${encodedTail}`;

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

  const metaTags = buildMetaTags({
    title: `${displayName} | Jawafdehi Entity Registry`,
    description: metaDescription,
    canonicalUrl,
    imageUrl: previewImageUrl(
      typeof record.image === 'string'
        ? record.image
        : typeof record.logo === 'string'
          ? record.logo
          : null,
      MEDIA_BASE,
    ) || SOCIAL_IMAGE_URL,
    imageAlt: displayName,
    // `profile` only for an actual Person — see entityOgType. Most entities here
    // are offices, courts and districts, and Open Graph's `profile` is the type
    // for a person.
    type: entityOgType(typeToken),
    alternates: [
      { href: apiUrl, type: 'application/json', title: 'Entity record (JSON-LD)' },
    ],
    jsonLd: entityStructuredData({
      canonicalUrl,
      iri: typeof record['@id'] === 'string' ? record['@id'] : null,
      entityType: typeToken,
      name: displayName,
      nameAlternate,
      aliases: aliasList(record.alternateName),
      description: metaDescription,
      officialUrl: typeof record.url === 'string' ? record.url : null,
      sameAs: typeof record.sameAs === 'string' ? [record.sameAs] : aliasList(record.sameAs),
      apiUrl,
    }),
  });
  return metaHtmlResponse(injectHeadMeta(indexHtml, metaTags));
}

// Inject share metadata for a CMS update/news article not yet pre-rendered.
async function handleUpdateMetaFallback(request: Request, env: Env, slug: string): Promise<Response | null> {
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
  const canonicalUrl = `${SITE_URL}/updates/${encodeURIComponent(slug)}`;
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
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const upstream = await fetchImageWithTimeout(
    `${JDS_API_BASE}/authors/${encodeURIComponent(slug)}/og-card.jpg`,
  );

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
  // Only successful responses are cached. The clone is required: the body is a
  // stream and can be read once.
  await cache.put(request, response.clone());
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    // Endpoints the Worker owns are matched on the trailing-slash-normalised
    // path, the same form the route match below uses. Comparing against the raw
    // pathname let /api/latest-videos/ miss its handler and fall through to the
    // SPA shell, which answered 200 with HTML where the caller expected JSON.
    const endpoint = normalizePath(path);

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

    // /research → the only research publication there is (302)
    //
    // The SPA has no /research route, so the bare path answered 404 even though
    // it is the address people shorten to and type. It points at the single
    // publication because that is currently the whole of the section.
    //
    // TEMPORARY, hence 302 rather than the permanent 301 /weekly uses above: once
    // there is more than one research item this redirect goes away and /research
    // becomes the section's own dashboard page. A 301 would by then be cached in
    // browsers we cannot reach.
    //
    // Target carries the trailing slash the pre-rendered page is published at, so
    // this is one hop rather than a 302 into the assets binding's own 307.
    if (endpoint === '/research') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/research/corruption-accountability/' + url.search,
          'Cache-Control': 'public, max-age=3600',
          ...secHeaders,
        },
      });
    }

    // Handle legacy numeric case redirects (301)
    const caseMatch = path.match(/^\/case\/(\d+)\/?$/);
    if (caseMatch) {
      const legacyId = caseMatch[1];
      const targetSlug = LEGACY_CASE_MAP[legacyId];
      if (targetSlug) {
        return new Response(null, {
          status: 301,
          headers: {
            'Location': `/case/${targetSlug}`,
            'Cache-Control': 'public, max-age=3600',
            ...secHeaders,
          },
        });
      }
    }

    // Court-case-ref case URLs: /case/081-CR-0116 → canonical slug (301)
    const courtRefMatch = path.match(/^\/case\/(\d+-[A-Za-z]+-\d+)\/?$/);
    if (courtRefMatch) {
      const targetSlug = await resolveCourtRefSlug(courtRefMatch[1]);
      if (targetSlug) {
        return new Response(null, {
          status: 301,
          headers: {
            'Location': `/case/${targetSlug}`,
            'Cache-Control': 'public, max-age=3600',
            ...secHeaders,
          },
        });
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

    // Case / update detail pages published after the last build aren't
    // pre-rendered, so the bare SPA shell would share with generic metadata.
    // Inject the record's real Open Graph / Twitter tags so link previews are
    // correct on every platform. Numeric / court-ref case URLs are already
    // redirected to their canonical slug above, so only slugs reach here.
    //
    // Gating on the matched route rather than a regex keeps sibling literal
    // routes out of it: /updates/preview is the Wagtail preview target, not an
    // article, and asking the CMS for an article named "preview" 404'd it.
    // Params come back percent-decoded.
    //
    // The whole block is guarded, because everything in it is derived from a
    // payload we do not control. Injecting share metadata is an ENHANCEMENT: if it
    // fails for any reason, the right outcome is the plain SPA shell — a page that
    // works with a generic preview — not a 500 that takes the page down. A single
    // `null` inside a case's `entities[]` used to throw here and would have done
    // exactly that to every case page. Each handler is defensive on its own now;
    // this is the backstop for the next shape change nobody predicted.
    try {
      if (matched?.path === '/case/:id' && matched.params.id) {
        const metaResponse = await handleCaseMetaFallback(request, env, matched.params.id);
        if (metaResponse) return metaResponse;
      }
      if (matched?.path === '/updates/:slug' && matched.params.slug) {
        const metaResponse = await handleUpdateMetaFallback(request, env, matched.params.slug);
        if (metaResponse) return metaResponse;
      }
      if (matched?.path === '/author/:slug' && matched.params.slug) {
        const metaResponse = await handleAuthorMetaFallback(request, env, matched.params.slug);
        if (metaResponse) return metaResponse;
      }
      // Entity record pages, keyed on the IRI tail (`<prefix>/<slug>`) the splat
      // carries. The sibling numeric /entity/:id route is deliberately not handled:
      // the case serializer no longer returns numeric entity ids, so no page links
      // there and the API 404s the ones that remain in circulation — which the SPA
      // already renders as "entity not found".
      if (matched?.path === '/entity/*' && matched.params['*']) {
        const metaResponse = await handleEntityMetaFallback(request, env, matched.params['*']);
        if (metaResponse) return metaResponse;
      }
    } catch {
      // Fall through to the shell.
    }

    const indexRequest = new Request(new URL('/', request.url).toString(), { method: 'GET' });
    const indexResponse = await env.ASSETS.fetch(indexRequest);

    // A path the SPA has no route for is a real 404, not a page. Serving the
    // shell at 200 made every typo and every dead link indexable, and told
    // link checkers the site had no broken links at all. The body is still the
    // shell so React Router renders the styled NotFound page — only the status
    // line changes, which is the part crawlers read.
    const status = matched ? 200 : 404;
    const spaResponse = new Response(indexResponse.body, {
      status,
      headers: indexResponse.headers,
    });
    for (const [key, value] of Object.entries(secHeaders)) {
      spaResponse.headers.set(key, value);
    }
    if (status === 404) {
      // Do not let a 404 sit in an edge or browser cache: the same path can
      // become real the moment a case is published.
      spaResponse.headers.set('Cache-Control', 'no-store');
      spaResponse.headers.set('X-Robots-Tag', 'noindex');
    }
    return spaResponse;
  },
};
