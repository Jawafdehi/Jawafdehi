import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";

import { getArticlePreview } from "@/services/cms-api";
import { ArticleView } from "@/components/ArticleView";
import NotFound from "./NotFound";

/**
 * Wagtail headless preview target. The article edit screen's preview iframe is
 * redirected here (by `wagtail_headless_preview`) with `content_type` + `token`
 * query params; we fetch the unsaved draft and render it with the same
 * `ArticleView` the public page uses, so editors preview the real styled
 * article on every device size. Client-rendered only — never pre-rendered.
 */
const UpdatePreview = () => {
    const [params] = useSearchParams();
    const contentType = params.get("content_type") ?? "";
    const token = params.get("token") ?? "";
    const hasParams = Boolean(contentType && token);

    const { data: article, isLoading, isError } = useQuery({
        queryKey: ["cms-article-preview", contentType, token],
        queryFn: () => getArticlePreview(contentType, token),
        enabled: hasParams,
        // Always refetch the latest draft when Wagtail reloads the iframe.
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: "always",
        retry: false,
    });

    if (!hasParams) {
        return <NotFound />;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Loading preview…</p>
            </div>
        );
    }

    if (isError || !article) {
        return <NotFound />;
    }

    return (
        <>
            {/* Drafts must never be indexed if the preview URL ever leaks. */}
            <Helmet>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            <ArticleView article={article} />
        </>
    );
};

export default UpdatePreview;
