import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for <ArticleView>, shared by the public update detail page
 * and the Wagtail preview. It mirrors that component's structure — breadcrumb,
 * category, title, date meta, hero image, body copy — inside the same page shell, so the
 * layout doesn't jump when the article arrives.
 *
 * `<main id="main-content">` is kept so the skip link still has a target while
 * the article is in flight.
 */
export const ArticleViewSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main id="main-content" className="flex-1 pb-20 pt-8 md:pt-12">
        <div className="layout-container">
          <div
            aria-label={t("updates.loadingUpdate", "Loading update")}
            aria-live="polite"
            role="status"
          >
            {/* Breadcrumb */}
            <Skeleton className="h-4 w-36" aria-hidden="true" />

            <div className="mt-8 max-w-5xl md:mt-10" aria-hidden="true">
              <div className="mb-10 space-y-4">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-11 w-full rounded-xl md:h-14" />
                <Skeleton className="h-11 w-2/3 rounded-xl md:h-14" />
                <div className="flex items-center gap-2 pt-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              {/* Hero image */}
              <Skeleton className="mb-10 aspect-[16/9] w-full rounded-[20px]" />

              {/* Body copy — a few paragraphs' worth of lines. */}
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              <div className="mt-8 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-10/12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
