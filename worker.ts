import { LEGACY_CASE_MAP } from './src/utils/legacyCaseMap';
import { courtRefCandidates } from './src/utils/courtCaseRef';
import { JAWAFDEHI_WEEKLY_SERIES } from './src/config/constants';
import {
  SITE_URL,
  SOCIAL_IMAGE_URL,
  buildHeadTags,
  escapeHtml,
  previewImageUrl,
  renderHeadTagsToHtml,
  stripHtml,
  truncateMeta,
} from './src/utils/seo';
import { stripMarkdown } from './src/utils/markdown';

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
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    return response.ok ? response : null;
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
  type?: 'article' | 'website';
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
function injectHeadMeta(indexHtml: string, title: string, metaTags: string): string {
  if (indexHtml.includes('<!--helmet-meta-->')) {
    return indexHtml
      .replace('<!--helmet-title-->', () => escapeHtml(title))
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

async function fetchIndexHtml(request: Request, env: Env): Promise<string | null> {
  const indexRequest = new Request(new URL('/', request.url).toString(), request);
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

// Inject share metadata for a published case not yet captured by pre-render.
async function handleCaseMetaFallback(request: Request, env: Env, slug: string): Promise<Response | null> {
  const apiResponse = await fetchWithTimeout(`${JDS_API_BASE}/cases/${encodeURIComponent(slug)}/`);
  if (!apiResponse) return null;

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
    'A verified corruption and misconduct case documented by Jawafdehi Nepal.',
  );
  const canonicalSlug = typeof caseData.slug === 'string' && caseData.slug.trim() ? caseData.slug : slug;
  const canonicalUrl = `${SITE_URL}/case/${encodeURIComponent(canonicalSlug)}`;
  const imageUrl =
    previewImageUrl(caseData.banner_url as string | null | undefined, MEDIA_BASE) ||
    previewImageUrl(caseData.thumbnail_url as string | null | undefined, MEDIA_BASE) ||
    SOCIAL_IMAGE_URL;

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

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
  });
  return metaHtmlResponse(injectHeadMeta(indexHtml, `${titleRaw} | Jawafdehi`, metaTags));
}

// Inject share metadata for a CMS update/news article not yet pre-rendered.
async function handleUpdateMetaFallback(request: Request, env: Env, slug: string): Promise<Response | null> {
  const apiResponse = await fetchWithTimeout(
    `${CMS_API_BASE}/pages/?type=content.ArticlePage&slug=${encodeURIComponent(slug)}&fields=*`,
  );
  if (!apiResponse) return null;

  let article: Record<string, unknown> | undefined;
  try {
    const payload = (await apiResponse.json()) as { items?: Array<Record<string, unknown>> };
    article = payload.items?.[0];
  } catch {
    return null;
  }
  if (!article) return null;

  const titleRaw = String(article.title || 'Jawafdehi Update');
  const description = truncateMeta(
    stripHtml(typeof article.excerpt === 'string' ? article.excerpt : '') ||
    'An update from Jawafdehi Nepal.',
  );
  const canonicalUrl = `${SITE_URL}/updates/${encodeURIComponent(slug)}`;
  const thumbnail = article.thumbnail as { url?: string; alt?: string } | null | undefined;
  const imageUrl = previewImageUrl(thumbnail?.url, MEDIA_BASE) || SOCIAL_IMAGE_URL;
  const meta = article.meta as { first_published_at?: string | null } | undefined;
  const date = typeof article.date === 'string' ? article.date : null;

  const indexHtml = await fetchIndexHtml(request, env);
  if (!indexHtml) return null;

  const metaTags = buildMetaTags({
    title: `${titleRaw} | Jawafdehi`,
    description,
    canonicalUrl,
    imageUrl,
    imageAlt: thumbnail?.alt || titleRaw,
    type: 'article',
    publishedTime: meta?.first_published_at || date,
    modifiedTime: date,
  });
  return metaHtmlResponse(injectHeadMeta(indexHtml, `${titleRaw} | Jawafdehi`, metaTags));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle oEmbed endpoint
    if (path === '/oembed' || path === '/oembed/') {
      return handleOembed(request);
    }

    if (path === '/document-preview' || path === '/document-preview/') {
      return handleDocumentPreview(request);
    }

    // Latest YouTube uploads for the Weekly Series "Past presentations" section
    if (path === '/api/latest-videos') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      return handleLatestVideos(request);
    }

    // The case-embed widget and the Wagtail headless preview both render inside
    // an <iframe>, so neither can send X-Frame-Options: DENY. The embed widget
    // is framable anywhere; the preview (an unsaved draft) is scoped to the CMS
    // admin and marked noindex — see previewSecurityHeaders.
    const isEmbedRoute = /^\/embed\/case\//.test(path);
    const isPreviewRoute = /^\/updates\/preview\/?$/.test(path);
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
    if (path === '/weekly' || path === '/weekly/') {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': '/saptahik' + url.search,
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

    // SPA fallback: serve index.html with 200
    if (request.method !== 'GET' && request.method !== 'HEAD') return asset;

    // Case / update detail pages published after the last build aren't
    // pre-rendered, so the bare SPA shell would share with generic metadata.
    // Inject the record's real Open Graph / Twitter tags so link previews are
    // correct on every platform. Numeric / court-ref case URLs are already
    // redirected to their canonical slug above, so only slugs reach here.
    const caseSlugMatch = path.match(/^\/case\/([^/]+)\/?$/);
    if (caseSlugMatch) {
      const metaResponse = await handleCaseMetaFallback(request, env, decodeURIComponent(caseSlugMatch[1]));
      if (metaResponse) return metaResponse;
    }
    const updateSlugMatch = path.match(/^\/updates\/([^/]+)\/?$/);
    if (updateSlugMatch) {
      const metaResponse = await handleUpdateMetaFallback(request, env, decodeURIComponent(updateSlugMatch[1]));
      if (metaResponse) return metaResponse;
    }

    const indexRequest = new Request(new URL('/', request.url).toString(), request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);
    const spaResponse = new Response(indexResponse.body, {
      status: 200,
      headers: indexResponse.headers,
    });
    for (const [key, value] of Object.entries(secHeaders)) {
      spaResponse.headers.set(key, value);
    }
    return spaResponse;
  },
};
