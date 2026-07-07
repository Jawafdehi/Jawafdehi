import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getArticleBySlug } from "@/services/cms-api";
import { ArticleView } from "@/components/ArticleView";
import NotFound from "./NotFound";

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

    const description = (article.excerpt || "").slice(0, 160);

    return (
        <>
            <Helmet>
                <title>{article.title} | Jawafdehi</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={article.title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="article" />
                {article.thumbnail?.url && <meta property="og:image" content={article.thumbnail.url} />}
                <meta name="twitter:card" content="summary_large_image" />
                {article.thumbnail?.url && <meta name="twitter:image" content={article.thumbnail.url} />}
            </Helmet>

            <ArticleView article={article} />
        </>
    );
};

export default UpdateDetail;
