import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { FormError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Plus } from "@/components/icons";
import { articlePath } from "@/lib/article-path";
import { getArticles, getBlogIndexId } from "@/services/cms-api";
import { extractErrorMessage } from "@/services/http";

// Blog posts are written in the Wagtail Newsroom (on the API origin at
// /newsroom/), in its Blog section. Staff can save and submit a post but not
// publish it; an admin approves it there, editing first if they like
// (meta-repo docs/2026-11-20-blog-approval). This page lists what is
// published and hands off to the Newsroom to write, review or edit. Drafts and
// posts awaiting approval are not served by the public CMS API, so they only
// appear in the Newsroom.
const API_ORIGIN = String(
  import.meta.env.VITE_JAWAFDEHI_API_BASE_URL || "https://api.jawafdehi.org",
).replace(/\/+$/, "");
const WAGTAIL_ADMIN = `${API_ORIGIN}/newsroom`;

export default function AdminBlog() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cms-articles", "BLOG"],
    queryFn: () => getArticles("BLOG"),
  });
  const { data: blogIndexId } = useQuery({
    queryKey: ["cms-blog-index"],
    queryFn: getBlogIndexId,
    staleTime: Infinity,
  });
  // Straight to a new post in the Blog section; the page tree if the section
  // is not known yet.
  const writeHref = blogIndexId
    ? `${WAGTAIL_ADMIN}/pages/add/content/articlepage/${blogIndexId}/`
    : `${WAGTAIL_ADMIN}/pages/`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("admin.blog.title", "Blog")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "admin.blog.subtitle",
              "Staff write posts in the Newsroom and submit them; an admin approves each one before it appears on /blog.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* The Newsroom dashboard's "Awaiting your review" is the approval
              queue for admins. */}
          <Button variant="outline" asChild>
            <a href={`${WAGTAIL_ADMIN}/`} target="_blank" rel="noopener noreferrer">
              {t("admin.blog.review", "Awaiting approval")}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild>
            <a href={writeHref} target="_blank" rel="noopener noreferrer">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("admin.blog.new", "Write a post")}
            </a>
          </Button>
        </div>
      </div>

      {error ? (
        <FormError message={extractErrorMessage(error, t("admin.blog.loadError", "Could not load blog posts."))} />
      ) : isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-label={t("common.loading", "Loading")} />
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("admin.blog.empty", "No blog posts are published yet.")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {(data ?? []).map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{post.title}</p>
                <p className="text-sm text-muted-foreground">{post.date}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={articlePath(post)} target="_blank" rel="noopener noreferrer">
                    {t("admin.blog.view", "View")}
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`${WAGTAIL_ADMIN}/pages/${post.id}/edit/`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("admin.blog.edit", "Edit")}
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
