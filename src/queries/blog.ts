import { getArticles } from "@/services/cms-api";

/**
 * The one definition of the published blog posts query, shared by /blog, the
 * home page's Recent blogs, /admin/blog and the SSR prefetch (entry-server),
 * so the server fills exactly the cache entry the client reads.
 */
export function blogPostsQuery() {
  return {
    queryKey: ["cms-articles", "BLOG"] as const,
    queryFn: () => getArticles("BLOG"),
  };
}
