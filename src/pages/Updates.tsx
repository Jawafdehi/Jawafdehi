import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Seo } from "@/components/Seo";
import { chipVariants } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getArticles } from "@/services/cms-api";
import type { ArticleCategory, ArticleListItem } from "@/types/cms";
import { formatPublicationDate } from "@/utils/date";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

type Filter = "ALL" | ArticleCategory;
const FILTERS: Filter[] = ["ALL", "NEWS", "UPDATE"];

/**
 * The feed's grid. Three columns on desktop, two on a tablet, one on a phone;
 * `grid-flow-dense` lets the short tiles fill in beside the tall lead story.
 */
const FEED_GRID = "grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";

/**
 * One story in the bento. Three shapes, chosen by the story rather than by a
 * toggle:
 *   - the LEAD (newest): two columns by two rows, the picture large;
 *   - a story WITH a picture: the image on top, the title under it;
 *   - a story WITHOUT one: a grey text panel, where the excerpt has room.
 * The whole tile is the link. Hover lifts only the picture's zoom; press scales
 * the tile to 0.99.
 */
function StoryTile({ article, lead = false }: Readonly<{ article: ArticleListItem; lead?: boolean }>) {
  const { t } = useTranslation();
  const image = article.thumbnail?.url;
  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Eyebrow tone={article.category === "NEWS" ? "accent" : "primary"} className="text-xs">
        {t(`updates.category.${article.category}`, article.category === "NEWS" ? "News" : "Update")}
      </Eyebrow>
      <span className="text-[13px] text-muted-foreground">{formatPublicationDate(article.date)}</span>
    </div>
  );

  return (
    <Link
      to={`/updates/${article.meta.slug}`}
      data-shape={lead ? "lead" : image ? "picture" : "text"}
      className={cn(
        "group flex h-full flex-col rounded-[28px] p-2 transition-[transform,border-color] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100",
        image || lead ? "border border-border/70 bg-surface hover:border-border" : "bg-muted",
      )}
    >
      {image ? (
        // The lead's picture grows to fill its two rows, so the tile has no
        // dead band under the text; the others keep 16:9.
        <div className={cn("relative overflow-hidden rounded-[22px] bg-muted", lead ? "aspect-[16/10] lg:aspect-auto lg:min-h-[18rem] lg:flex-1" : "aspect-video")}>
          <img
            src={image}
            alt={article.thumbnail?.alt || ""}
            loading={lead ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
      ) : null}
      <div className={cn("flex flex-col", lead && image ? "lg:flex-none" : "flex-1", image ? "px-4 pb-4 pt-5" : "p-5 md:p-6")}>
        {meta}
        <h2
          className={cn(
            "mt-3 font-normal text-primary",
            lead ? "text-[28px] leading-tight tracking-[-0.01em] md:text-[32px]" : "text-[19px] leading-snug",
            !lead && "line-clamp-3",
          )}
        >
          {article.title}
        </h2>
        <p
          className={cn(
            "mt-3 text-[15px] leading-6 text-muted-foreground",
            lead ? "line-clamp-3 max-w-2xl" : image ? "line-clamp-2" : "line-clamp-5",
          )}
        >
          {article.excerpt}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[15px] font-medium text-primary">
          {t("updates.readMore")}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

/** The feed while it loads: the same bento, as quiet blocks. */
function FeedSkeleton() {
  const { t } = useTranslation();
  return (
    <output aria-label={t("updates.loading", "Loading updates")} className={FEED_GRID}>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          data-skeleton=""
          className={cn(
            "rounded-[28px] border border-border/70 p-2",
            index === 0 && "md:col-span-2 lg:row-span-2",
          )}
        >
          <Skeleton className={cn("w-full rounded-[22px]", index === 0 ? "aspect-[16/10]" : "aspect-video")} />
          <div className="space-y-3 px-4 pb-4 pt-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </output>
  );
}

const Updates = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("ALL");

  const { data: articles, isLoading, isError } = useQuery({
    queryKey: ["cms-articles"],
    queryFn: () => getArticles(),
  });

  const shown = (articles ?? []).filter((article) => filter === "ALL" || article.category === filter);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`Updates | ${SITE_NAME}`}
        description="Latest news, announcements, and updates from the Jawafdehi team on Nepal's corruption accountability platform."
        canonicalUrl={`${SITE_URL}/updates/`}
      />

      <main id="main-content" className="flex-1">
        {/* A light hero like /whats-new and /products: the archive's diamond
            field inverted onto the white page, the site's eyebrow, the title. */}
        <section aria-labelledby="updates-title" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-10 w-full md:w-2/3 [mask-image:linear-gradient(to_left,#000_35%,transparent)]"
          >
            <ShaderBackdrop design="diamondLight" />
          </div>
          <div className="layout-container py-16 md:py-24">
            <Eyebrow>{t("updates.eyebrow", "From the team")}</Eyebrow>
            <h1 id="updates-title" className="font-home-display mt-4 text-4xl text-primary sm:text-5xl md:text-6xl">
              {t("updates.title")}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-7 text-muted-foreground">{t("updates.description")}</p>
          </div>
        </section>

        <section aria-labelledby="updates-title" className="pb-20 md:pb-28">
          <div className="layout-container">
            <div role="group" aria-label={t("updates.filterLabel", "Show")} className="mb-8 flex flex-wrap gap-1">
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={chipVariants({ active: filter === option })}
                >
                  {option === "ALL"
                    ? t("updates.all", "All")
                    : t(`updates.filter.${option}`, option === "NEWS" ? "News" : "Updates")}
                </button>
              ))}
            </div>

            {isError ? (
              <p className="text-muted-foreground">{t("updates.error", "We couldn't load updates right now. Please try again later.")}</p>
            ) : isLoading ? (
              <FeedSkeleton />
            ) : shown.length === 0 ? (
              <p className="text-muted-foreground">{t("updates.empty", "No updates have been published yet.")}</p>
            ) : (
              <ul className={FEED_GRID}>
                {shown.map((article, index) => (
                  <li key={article.id} className={cn(index === 0 && "md:col-span-2 lg:row-span-2")}>
                    <StoryTile article={article} lead={index === 0} />
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

export default Updates;
