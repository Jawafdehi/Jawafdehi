import { LEGACY_CASE_MAP } from './src/utils/legacyCaseMap';
import { courtRefCandidates } from './src/utils/courtCaseRef';
import { JAWAFDEHI_WEEKLY_SERIES } from './src/config/constants';

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const JDS_API_BASE = 'https://api.jawafdehi.org/api';

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
  return {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.jawafdehi.org https://portal.jawafdehi.org https://jawafdehi.org https://nes.jawafdehi.org https://auth.jawafdehi.org; worker-src blob:;",
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

function extractCaseSlugFromUrl(caseUrl: string): string | null {
  try {
    const parsed = new URL(caseUrl);
    const match = parsed.pathname.match(/^\/case\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
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
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400);
  }

  const slug = extractCaseSlugFromUrl(targetUrl);
  if (!slug) {
    return jsonResponse({ error: 'Invalid case URL. Expected format: https://jawafdehi.org/case/{slug}' }, 400);
  }

  try {
    const apiUrl = `${JDS_API_BASE}/cases/${encodeURIComponent(slug)}/`;
    const apiResponse = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!apiResponse.ok) {
      return jsonResponse({ error: 'Case not found' }, 404);
    }

    const caseData = await apiResponse.json() as Record<string, unknown>;
    const caseUrl = `https://jawafdehi.org/case/${slug}`;
    const embedUrl = `https://jawafdehi.org/embed/case/${slug}`;
    const title = (caseData.title as string) || 'Untitled Case';

    return jsonResponse({
      type: 'rich',
      version: '1.0',
      title,
      author_name: 'Jawafdehi',
      author_url: 'https://jawafdehi.org',
      provider_name: 'Jawafdehi',
      provider_url: 'https://jawafdehi.org',
      cache_age: 86400,
      thumbnail_url: (caseData.thumbnail_url as string) || (caseData.banner_url as string) || null,
      html: `<iframe src="${embedUrl}" width="480" height="360" frameborder="0" title="${title}" style="max-width:100%;overflow:hidden;border:none;border-radius:8px" allowfullscreen></iframe>`,
      width: 480,
      height: 360,
    });
  } catch {
    return jsonResponse({ error: 'Failed to fetch case data' }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle oEmbed endpoint
    if (path === '/oembed') {
      return handleOembed(request);
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
