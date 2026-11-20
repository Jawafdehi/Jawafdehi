import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { FormError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Plus } from "@/components/icons";
import { getArticles } from "@/services/cms-api";
import { extractErrorMessage } from "@/services/http";

// Blog posts are authored in the Wagtail CMS (the API has no write endpoint for
// articles), which lives on the API origin at /newsroom/. This page lists what
// is published and hands off to Wagtail to write or edit. Drafts are not
// returned by the public CMS API, so they only appear inside Wagtail.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("admin.blog.title", "Blog")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "admin.blog.subtitle",
              "Posts are written in the Wagtail CMS. Published posts are listed here.",
            )}
          </p>
        </div>
        <Button asChild>
          <a href={`${WAGTAIL_ADMIN}/pages/`} target="_blank" rel="noopener noreferrer">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("admin.blog.new", "New post in Wagtail")}
          </a>
        </Button>
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
                  <a href={`/updates/${post.meta.slug}`} target="_blank" rel="noopener noreferrer">
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
