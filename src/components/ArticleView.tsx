import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
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

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <main id="main-content" className="flex-1 py-8 md:py-12">
                <div className="layout-container animate-fade-in">
                    <div className="mb-8">
                        <Button
                            variant="ghost"
                            asChild
                            className="pl-0 hover:bg-transparent hover:text-primary"
                        >
                            <Link to="/updates" className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4 relative -top-px" />
                                <span className="mt-1">{t("updates.backToUpdates")}</span>
                            </Link>
                        </Button>
                    </div>

                    <div className="mx-auto max-w-4xl">
                        <article className="max-w-none">
                            <div className="mb-8">
                                <h1 className="font-page-title mb-4">{article.title}</h1>
                                <div className="font-meta flex items-center">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span className="mt-1">{formatPublicationDate(article.date)}</span>
                                </div>
                            </div>

                            {article.thumbnail?.url && (
                                <figure className="mb-8">
                                    <img
                                        src={article.thumbnail.url}
                                        alt={article.thumbnail.alt || article.title}
                                        width={article.thumbnail.width}
                                        height={article.thumbnail.height}
                                        className="w-full rounded-lg"
                                    />
                                    {article.thumbnail.alt ? (
                                        <figcaption className="font-caption mt-2 text-muted-foreground">
                                            {article.thumbnail.alt}
                                        </figcaption>
                                    ) : null}
                                </figure>
                            )}

                            <div className="font-paragraph content-prose markdown-content">
                                <StreamField blocks={article.body} />
                            </div>
                        </article>

                        {article.related_cases && article.related_cases.length > 0 && (
                            <section className="mx-auto mt-12 max-w-4xl">
                                <h2 className="font-card-title">
                                    {t("updates.relatedCases", "Related cases")}
                                </h2>
                                <div className="mt-4 grid gap-3">
                                    {article.related_cases.map((relatedCase) => (
                                        <Link
                                            key={relatedCase.id}
                                            to={`/case/${relatedCase.slug}`}
                                            className="flex items-center justify-between gap-3 rounded-lg bg-card p-4 transition-colors hover:bg-primary-surface/[0.03]"
                                        >
                                            <span className="font-card-title">{relatedCase.title}</span>
                                            <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
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
