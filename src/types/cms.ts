/**
 * Types for the Wagtail headless CMS (API v2) that serves Updates/News articles.
 * Mounted on the unified monolith at `/api/cms/v2` (see services/cms-api.ts).
 */

export type ArticleCategory = "UPDATE" | "NEWS";

export interface CmsImageRendition {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface StreamImageValue {
  image:
    | { id: number; title: string; alt: string; url?: string; width?: number; height?: number }
    | null;
  caption?: string;
}

export interface StreamDocumentValue {
  id: number;
  title: string;
  url: string;
  filename: string;
}

export interface StreamCaseValue {
  case: { id: number; case_id: string; title: string; slug: string } | null;
  note?: string;
}

export interface StreamEmbedValue {
  url?: string;
  html?: string;
}

export type StreamBlock =
  | { type: "heading"; value: string; id: string }
  | { type: "paragraph"; value: string; id: string }
  | { type: "quote"; value: string; id: string }
  | { type: "image"; value: StreamImageValue; id: string }
  | { type: "document"; value: StreamDocumentValue; id: string }
  | { type: "embed"; value: string | StreamEmbedValue; id: string }
  | { type: "case"; value: StreamCaseValue; id: string }
  | { type: string; value: unknown; id: string };

export interface RelatedCase {
  id: number;
  case_id: string;
  title: string;
  slug: string;
}

export interface ArticleListItem {
  id: number;
  meta: {
    type: string;
    slug: string;
    first_published_at: string | null;
    html_url?: string | null;
  };
  title: string;
  category: ArticleCategory;
  date: string;
  excerpt: string;
  thumbnail: CmsImageRendition | null;
}

export interface Article extends ArticleListItem {
  body: StreamBlock[];
  related_cases: RelatedCase[];
}

export interface WagtailListResponse<T> {
  meta: { total_count: number };
  items: T[];
}
