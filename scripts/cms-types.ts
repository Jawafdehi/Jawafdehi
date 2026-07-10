export interface WagtailListResponse<T> {
  meta: { total_count: number };
  items: T[];
}

export interface ArticleListItem {
  id: number;
  meta: {
    slug: string;
    first_published_at: string | null;
    html_url?: string | null;
  };
  title: string;
  category: 'UPDATE' | 'NEWS';
  date: string;
  excerpt: string;
  thumbnail: {
    url: string;
    width: number;
    height: number;
    alt: string;
  } | null;
}
