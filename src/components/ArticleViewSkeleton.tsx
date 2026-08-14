import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for <ArticleView>, shared by the public update detail page
 * and the Wagtail preview. It mirrors that component's structure — back link,
 * title, date meta, hero image, body copy — inside the same page shell, so the
 * layout doesn't jump when the article arrives.
 *
 * `<main id="main-content">` is kept so the skip link still has a target while
 * the article is in flight.
 */
export const ArticleViewSkeleton = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main id="main-content" className="flex-1 py-8 md:py-12">
        <div className="layout-container">
          <div
            aria-label={t("updates.loadingUpdate", "Loading update")}
            aria-live="polite"
            role="status"
          >
            {/* Back to updates */}
            <div className="mb-8">
              <Skeleton className="h-10 w-40" aria-hidden="true" />
            </div>

            <div className="mx-auto max-w-4xl" aria-hidden="true">
              <div className="mb-8 space-y-3">
                <Skeleton className="h-9 w-full md:h-12" />
                <Skeleton className="h-9 w-2/3 md:h-12" />
                <div className="flex items-center gap-2 pt-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              {/* Hero image */}
              <Skeleton className="mb-8 h-64 w-full rounded-lg md:h-96" />

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
