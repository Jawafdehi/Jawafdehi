import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, ArrowRight } from "@/components/icons";

import { StreamField } from "@/components/StreamField";
import { formatPublicationDate } from "@/utils/date";
import type { Article } from "@/types/cms";

/**
 * Presentational article view shared by the public Updates detail page and the
 * Wagtail headless preview. Keeping a single component guarantees editors
 * preview the article exactly as it renders live (desktop, tablet, mobile).
 */
export const ArticleView = ({ article }: { article: Article }) => {
    const { t } = useTranslation();

    // The hero renders `w-full` inside a max-w-4xl (896px) column, so the 800px
    // card rendition was upscaled by the browser even at DPR 1. Prefer the
    // 1600px one; fall back to `thumbnail` so this still renders if the
    // frontend deploys ahead of the API field.
    const hero = article.thumbnail_large ?? article.thumbnail;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <main id="main-content" className="flex-1 pb-20 pt-8 md:pt-12">
                <div className="layout-container">
                    <PageBreadcrumb
                      items={[
                        { label: t("nav.home"), to: "/" },
                        { label: t("nav.updates", "Updates"), to: "/updates" },
                      ]}
                    />

                    {/* One reading column, 48rem: the category pill, the title in
                        the display face, the date; the picture framed at the
                        column's width; then the text at the reading pages' 18px. */}
                    <div className="mx-auto mt-10 max-w-3xl md:mt-14">
                        <article>
                            <header className="mb-10">
                                <span className="inline-flex h-8 items-center rounded-full bg-muted px-3.5 text-sm text-primary">
                                    {t(`updates.category.${article.category}`, article.category === "NEWS" ? "News" : "Update")}
                                </span>
                                <h1 className="font-home-display mt-5 text-balance text-4xl text-primary sm:text-5xl [:root[lang=en]_&]:leading-[1.08]">
                                    {article.title}
                                </h1>
                                <p className="mt-5 flex items-center gap-2 text-[15px] text-muted-foreground">
                                    <Calendar className="h-[18px] w-[18px]" aria-hidden="true" />
                                    <time dateTime={article.date}>{formatPublicationDate(article.date)}</time>
                                </p>
                            </header>

                            {hero?.url && (
                                <figure className="mb-10">
                                    <img
                                        src={hero.url}
                                        alt={hero.alt || article.title}
                                        width={hero.width}
                                        height={hero.height}
                                        className="w-full rounded-[20px] border border-border/70"
                                    />
                                    {hero.alt ? (
                                        <figcaption className="mt-3 text-sm text-muted-foreground">
                                            {hero.alt}
                                        </figcaption>
                                    ) : null}
                                </figure>
                            )}

                            <div className="content-prose markdown-content text-lg leading-8 text-primary/85">
                                <StreamField blocks={article.body} />
                            </div>
                        </article>

                        {article.related_cases && article.related_cases.length > 0 && (
                            <section className="mt-16 border-t border-border/70 pt-10">
                                <h2 className="font-home-display text-3xl text-primary md:text-4xl">
                                    {t("updates.relatedCases", "Related cases")}
                                </h2>
                                <div className="mt-6 grid gap-3">
                                    {article.related_cases.map((relatedCase) => (
                                        <Link
                                            key={relatedCase.id}
                                            to={`/case/${relatedCase.slug}`}
                                            className="group flex items-center justify-between gap-4 rounded-[20px] border border-border/70 bg-surface p-5 transition-[border-color] duration-200 ease-out hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <span className="text-[17px] leading-snug text-primary">{relatedCase.title}</span>
                                            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ArticleView;
