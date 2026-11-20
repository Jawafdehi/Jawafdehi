// The latest few blog posts on the home page, with a link to the full /blog.
// Hidden while loading, on error, and when nothing is published: a blog section
// that says "nothing here" would be worse on the front page than no section.
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ArrowRight } from "@/components/icons";
import { Reveal } from "@/components/ui/reveal";
import { StoryTile } from "@/pages/Updates";
import { getArticles } from "@/services/cms-api";

export const HOME_BLOG_POST_COUNT = 3;

export function BlogSection() {
  const { t } = useTranslation();
  const { data: articles } = useQuery({
    queryKey: ["cms-articles", "BLOG"],
    queryFn: () => getArticles("BLOG"),
    staleTime: 5 * 60 * 1000,
  });

  const posts = (articles ?? []).slice(0, HOME_BLOG_POST_COUNT);
  if (posts.length === 0) return null;

  return (
    <section id="blog" className="py-12 md:py-16">
      <div className="layout-container">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h2 className="font-home-section-title text-primary">{t("home.blog.heading", "From the blog")}</h2>
            <Link
              to="/blog"
              className="group inline-flex items-center gap-1.5 rounded text-base font-medium text-accent hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t("home.blog.viewAll", "All blog posts")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((article, index) => (
            <li key={article.id}>
              <Reveal className="h-full" delayMs={index * 90}>
                <StoryTile article={article} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
