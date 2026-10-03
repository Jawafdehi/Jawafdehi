import { useEffect, useRef, useState, type ComponentProps, type FunctionComponent } from "react";
import type { DiscussionEmbed as DiscussionEmbedType } from "disqus-react";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { lazyChart } from "@/components/charts/lazy";

// disqus-react, deferred out of the initial payload. The embed is already
// double-gated at runtime (IntersectionObserver + an explicit "load comments"
// click) and its markup is never in pre-rendered HTML — the gates start closed
// and only open in client effects — so the module itself has no business in the
// entry chunk. Same effect-loading pattern (and same no-Suspense rationale) as
// charts/lazy.tsx; the skeleton placeholder matches the pre-load state.
type DiscussionEmbedProps = ComponentProps<typeof DiscussionEmbedType>;
const LazyDiscussionEmbed = lazyChart<DiscussionEmbedProps>(
  () =>
    import("disqus-react").then(
      // A class component; React renders it the same way, so the cast to the
      // FunctionComponent shape lazyChart expects is safe.
      (m) => m.DiscussionEmbed as unknown as FunctionComponent<DiscussionEmbedProps>,
    ),
  () => <Skeleton className="h-32 w-full rounded-md" />,
);

interface DisqusCommentsProps {
  caseId: string;
  caseTitle: string;
  caseUrl: string;
}

/**
 * DisqusComments - A lazy-loaded, accessible comment section using Disqus.
 * 
 * Features:
 * - Lazy loading via IntersectionObserver for better page performance
 * - Bilingual support (English/Nepali)
 * - Print exclusion (hidden when printing)
 * - Accessible with proper ARIA labels and heading hierarchy
 */
export function DisqusComments({ caseId, caseTitle, caseUrl }: DisqusCommentsProps) {
  const { t, i18n } = useTranslation();
  
  // Hardcoded for single-organization deployment (Jawafdehi Initiative)
  // No environment variable needed - comments are always enabled
  const disqusShortname = "jawafdehi-initiative";
  
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Lazy load: Start loading Disqus when section comes into view
  useEffect(() => {
    // SSR guard: if IntersectionObserver is unavailable, skip lazy-loading
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      setShouldLoad(true);
      return;
    }

    // Held across the observer callback so cleanup can cancel a pending timer;
    // otherwise an unmount between intersection and fire leaks a setShouldLoad
    // that touches `window` after teardown.
    let loadTimeout: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Small delay to ensure smooth scroll experience
          loadTimeout = setTimeout(() => setShouldLoad(true), 100);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before section is visible
        threshold: 0
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
      if (loadTimeout !== undefined) {
        clearTimeout(loadTimeout);
      }
    };
  }, []);

  // Map i18n language to Disqus language code (handles variants like "ne-NP")
  const disqusLanguage = i18n.language.startsWith("ne") ? "ne" : "en";

  const disqusConfig = {
    url: caseUrl,
    identifier: `case-${caseId}`, // Unique identifier for this case's comment thread
    title: caseTitle,
    language: disqusLanguage,
  };

  const handleLoadComments = () => {
    setShouldLoad(true);
  };

  return (
    <section
      ref={sectionRef}
      className="mt-12 mb-8 disqus-comments print:hidden bg-transparent p-0 shadow-none sm:rounded-2xl sm:bg-card/40 sm:p-8 sm:shadow-sm"
      aria-labelledby="comments-heading"
    >
      <Separator className="mb-8" />
      
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
        <h2 
          id="comments-heading" 
          className="text-2xl font-bold text-foreground"
        >
          {t("caseDetail.comments.title")}
        </h2>
      </div>
      
      <p className="text-muted-foreground mb-6">
        {t("caseDetail.comments.joinDiscussion")}
      </p>

      {!isVisible && (
        // Placeholder before section comes into view
        <div className="space-y-4 rounded-xl border border-dashed border-muted-foreground/30 bg-background/70 p-4 sm:p-5">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      )}

      {isVisible && !shouldLoad && (
        // Section is visible but user hasn't triggered load yet
        <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30 px-4 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
          <p className="text-muted-foreground mb-4">{t("caseDetail.comments.loading")}</p>
          <Button onClick={handleLoadComments} variant="default" className="min-w-40">
            {t("caseDetail.comments.loadComments")}
          </Button>
        </div>
      )}

      {shouldLoad && (
        // Disqus widget loaded
        <div className="rounded-xl border border-border/70 bg-background p-3 sm:p-4 shadow-inner">
          <LazyDiscussionEmbed
            shortname={disqusShortname}
            config={disqusConfig}
          />
        </div>
      )}
    </section>
  );
}
