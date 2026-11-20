// "Recent blogs" on the home page: the latest blog posts, two side by side,
// set like the release notes on /mcp and /likhit (a small line, a display-face
// title, a sentence, "Read more"), with a link to the whole /blog. Hidden while
// loading, on error and when nothing is published: an empty section would be
// worse on the front page than none.
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ArrowRight } from "@/components/icons";
import { ListingHead } from "@/components/ui/listing-head";
import { Reveal } from "@/components/ui/reveal";
import { articlePath } from "@/lib/article-path";
import { blogPostsQuery } from "@/queries/blog";
import type { ArticleListItem } from "@/types/cms";
import { formatDateForLanguage } from "@/utils/date";

export const HOME_BLOG_POST_COUNT = 2;

export function BlogSection() {
  const { t } = useTranslation();
  const { data: articles } = useQuery({ ...blogPostsQuery(), staleTime: 5 * 60 * 1000 });

  const posts = (articles ?? []).slice(0, HOME_BLOG_POST_COUNT);
  if (posts.length === 0) return null;

  return (
    <section id="recent-writing" className="py-12 md:py-16">
      <div className="layout-container">
        <ListingHead heading={t("home.blog.heading")} to="/blog/" linkLabel={t("home.blog.viewAll")} />
        <ul className="mt-10 grid gap-x-14 gap-y-8 md:grid-cols-2">
          {posts.map((post, index) => (
            <li key={post.id}>
              <Reveal delayMs={index * 80}>
                <BlogEntry post={post} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BlogEntry({ post }: Readonly<{ post: ArticleListItem }>) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ne" ? "ne" : "en";
  return (
    <article>
      <p className="text-sm uppercase tracking-wider text-muted-foreground [:root[lang=ne]_&]:normal-case [:root[lang=ne]_&]:tracking-normal">
        {t("updates.category.BLOG")}
        <span aria-hidden="true"> · </span>
        {/* Bikram Sambat first in Nepali, AD in English, as on case pages. */}
        <time dateTime={post.date}>{formatDateForLanguage(post.date, "PP", null, lang).primary}</time>
      </p>
      <h3 className="font-home-display mt-3 text-xl leading-[1.12] text-primary md:text-2xl">{post.title}</h3>
      {post.excerpt ? <p className="mt-2 line-clamp-3 max-w-xl text-base leading-7 text-foreground/70">{post.excerpt}</p> : null}
      <Link
        to={articlePath(post)}
        className="group mt-5 inline-flex items-center gap-1.5 rounded text-base font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t("home.blog.readMore")}
        <span className="sr-only">: {post.title}</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </article>
  );
}
