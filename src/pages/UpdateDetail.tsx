import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getArticleBySlug } from "@/services/cms-api";
import { ArticleView } from "@/components/ArticleView";
import { Seo } from "@/components/Seo";
import NotFound from "./NotFound";
import { previewImageUrl, SITE_URL, SOCIAL_IMAGE_URL, truncateMeta } from "@/utils/seo";

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
            <Seo
                title={metaTitle}
                description={description}
                canonicalUrl={canonicalUrl}
                type="article"
                imageUrl={ogImage}
                imageAlt={imageAlt}
                publishedTime={article.meta.first_published_at}
                modifiedTime={article.date}
            />

            <ArticleView article={article} />
        </>
    );
};

export default UpdateDetail;
