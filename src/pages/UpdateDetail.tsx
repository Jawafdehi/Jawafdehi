import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getArticleBySlug } from "@/services/cms-api";
import { ArticleView } from "@/components/ArticleView";
import { ArticleViewSkeleton } from "@/components/ArticleViewSkeleton";
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
        return <ArticleViewSkeleton />;
    }

    if (isError || !article) {
        return <NotFound />;
    }

    const canonicalUrl = `${SITE_URL}/updates/${article.meta.slug}`;
    // Prefer the dedicated social rendition: 1200x630 JPEG, which is the shape
    // unfurlers ask for. `thumbnail` is a 16:9 WebP, so it's only the fallback
    // for the window where the API hasn't shipped `og_image` yet.
    const social = article.og_image ?? article.thumbnail;
    const ogImage =
        previewImageUrl(social?.url, "https://portal.jawafdehi.org") ||
        SOCIAL_IMAGE_URL;
    const metaTitle = `${article.title} | Jawafdehi`;
    const description = truncateMeta(article.excerpt || "");
    const imageAlt = social?.alt || article.title;
    // Only meaningful when the tags describe the article's own image; the
    // site-wide fallback card has different dimensions.
    const usingArticleImage = ogImage !== SOCIAL_IMAGE_URL;

    return (
        <>
            <Seo
                title={metaTitle}
                description={description}
                canonicalUrl={canonicalUrl}
                type="article"
                imageUrl={ogImage}
                imageAlt={imageAlt}
                imageWidth={usingArticleImage ? social?.width : undefined}
                imageHeight={usingArticleImage ? social?.height : undefined}
                publishedTime={article.meta.first_published_at}
                modifiedTime={article.date}
            />

            <ArticleView article={article} />
        </>
    );
};

export default UpdateDetail;
