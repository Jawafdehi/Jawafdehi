import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FEED_GRID, FeedSkeleton, StoryTile } from "@/pages/Updates";
import { blogPostsQuery } from "@/queries/blog";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

/**
 * The blog: every published post from the CMS, newest first. Posts are written
 * in the Wagtail admin, like Updates, and share its query key, so moving
 * between the two pages (or from the home page's blog section) costs no
 * second request.
 */
const Blog = () => {
  const { t } = useTranslation();

  const { data: articles, isLoading, isError } = useQuery({
    ...blogPostsQuery(),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`Blog | ${SITE_NAME}`}
        description="Stories, explainers, and behind-the-scenes notes from the Jawafdehi team on Nepal's corruption accountability work."
        canonicalUrl={`${SITE_URL}/blog/`}
      />

      <main id="main-content" className="flex-1">
        <section aria-labelledby="blog-title" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
          >
            <ShaderBackdrop design="diamondLight" />
          </div>
          <div className="layout-container py-16 md:py-24">
            <Eyebrow>{t("blog.eyebrow", "From the team")}</Eyebrow>
            <h1 id="blog-title" className="font-home-display mt-4 text-4xl text-primary sm:text-5xl md:text-6xl">
              {t("blog.title", "Blog")}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-7 text-muted-foreground">
              {t("blog.description", "Stories, explainers, and notes from the people building Jawafdehi.")}
            </p>
          </div>
        </section>

        <section aria-labelledby="blog-title" className="pb-20 md:pb-28">
          <div className="layout-container">
            {isError ? (
              <EmptyState
                kind="couldNotLoad"
                title={t("blog.errorTitle", "The blog didn't load")}
                description={t("blog.error", "We couldn't load blog posts right now. Please try again later.")}
              />
            ) : isLoading ? (
              <FeedSkeleton />
            ) : (articles ?? []).length === 0 ? (
              <EmptyState
                kind="nothingYet"
                title={t("blog.emptyTitle", "Nothing here yet")}
                description={t("blog.empty", "No blog posts have been published yet.")}
              />
            ) : (
              <ul className={FEED_GRID}>
                {(articles ?? []).map((article) => (
                  <li key={article.id}>
                    <StoryTile article={article} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Blog;
