/**
 * Wagtail CMS (headless) client for public Updates/News articles.
 *
 * Backed by Wagtail API v2, mounted under the Jawafdehi API at `/cms/v2`.
 * Only live/published pages are returned by the API.
 */

import { http } from "./http";

import type {
  Article,
  ArticleCategory,
  ArticleListItem,
  WagtailListResponse,
} from "@/types/cms";

// Wagtail API v2 is mounted under the unified monolith root at `/api/cms/v2`.
const CMS_BASE = "/api/cms/v2";

const ARTICLE_TYPE = "content.ArticlePage";
const LIST_FIELDS = "title,category,date,excerpt,thumbnail";

/** List published articles (newest first), optionally filtered by category. */
export async function getArticles(
  category?: ArticleCategory,
): Promise<ArticleListItem[]> {
  const params: Record<string, string | number> = {
    type: ARTICLE_TYPE,
    fields: LIST_FIELDS,
    order: "-date",
    limit: 20, // Wagtail API v2 default max page size (WAGTAILAPI_LIMIT_MAX)
  };
  if (category) {
    params.category = category;
  }
  const res = await http.get<WagtailListResponse<ArticleListItem>>(
    `${CMS_BASE}/pages/`,
    { params, timeout: 10000 },
  );
  return res.data.items;
}

/** Fetch a single published article by its slug, or null if not found. */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const res = await http.get<WagtailListResponse<Article>>(`${CMS_BASE}/pages/`, {
    params: { type: ARTICLE_TYPE, slug, fields: "*" },
    timeout: 10000,
  });
  return res.data.items[0] ?? null;
}

/**
 * Fetch the current *unsaved* draft for the Wagtail headless preview iframe.
 *
 * The edit-screen preview redirects here with `content_type` + `token` (set by
 * `wagtail_headless_preview` on the backend). The draft is resolved from the
 * token, so the pk in the detail path is a placeholder (`0`); the response is a
 * single serialized page with the same fields as a published article, so the
 * preview renders identically.
 */
export async function getArticlePreview(
  contentType: string,
  token: string,
): Promise<Article | null> {
  const res = await http.get<Article>(`${CMS_BASE}/page_preview/0/`, {
    params: { content_type: contentType, token, fields: "*" },
    headers: { Accept: "application/json" },
    timeout: 10000,
  });
  return res.data ?? null;
}
