import type { ArticleListItem } from "@/types/cms";

/** The public path of an article: blog posts live under /blog, the rest under /updates. */
export function articlePath(article: Pick<ArticleListItem, "category" | "meta">): string {
  return `${article.category === "BLOG" ? "/blog" : "/updates"}/${article.meta.slug}`;
}
