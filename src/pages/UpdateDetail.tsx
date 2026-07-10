import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getArticleBySlug } from "@/services/cms-api";
import { ArticleView } from "@/components/ArticleView";
import NotFound from "./NotFound";
import { previewImageUrl, SITE_NAME, SITE_URL, SOCIAL_IMAGE_URL, truncateMeta } from "@/utils/seo";

const UpdateDetail = () => {
    const { slug } = useParams();

    const { data: article, isLoading, isError } = useQuery({
        queryKey: ["cms-article", slug],
        queryFn: () => getArticleBySlug(slug as string),
        enabled: Boolean(slug),
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (isError || !article) {
        return <NotFound />;
    }

    const canonicalUrl = `${SITE_URL}/updates/${article.meta.slug}`;
    const ogImage =
        previewImageUrl(article.thumbnail?.url, "https://portal.jawafdehi.org") ||
        SOCIAL_IMAGE_URL;
    const metaTitle = `${article.title} | Jawafdehi`;
    const description = truncateMeta(article.excerpt || "");
    const imageAlt = article.thumbnail?.alt || article.title;

    return (
        <>
            <Helmet>
                <title>{metaTitle}</title>
                <meta name="description" content={description} />
                <link rel="canonical" href={canonicalUrl} />

                <meta property="og:site_name" content={SITE_NAME} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:title" content={metaTitle} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content={ogImage} />
                <meta property="og:image:alt" content={imageAlt} />
                <meta property="og:locale" content="en_US" />

                {article.meta.first_published_at && (
                    <meta property="article:published_time" content={article.meta.first_published_at} />
                )}
                <meta property="article:modified_time" content={article.date} />

                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={metaTitle} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content={ogImage} />
                <meta name="twitter:image:alt" content={imageAlt} />
            </Helmet>

            <ArticleView article={article} />
        </>
    );
};

export default UpdateDetail;
