import { useEffect, useRef, useState, type ComponentProps, type FunctionComponent } from "react";
import type { DiscussionEmbed as DiscussionEmbedType } from "disqus-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
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

  // The discussion in the case page's own terms: a section heading at the
  // reading size, one line under it, and the comments in a hairline card.
  // It used to be a grey slab with a rule, an icon and a bold 24px title.
  return (
    <section
      ref={sectionRef}
      className="disqus-comments mb-8 mt-16 print:hidden"
      aria-labelledby="comments-heading"
    >
      <h2 id="comments-heading" className="font-case-section-title">
        {t("caseDetail.comments.title")}
      </h2>
      <p className="mb-6 mt-2 text-lg leading-8 text-muted-foreground">
        {t("caseDetail.comments.joinDiscussion")}
      </p>

      {!isVisible && (
        // Placeholder before section comes into view
        <div className="space-y-4 rounded-[24px] border border-border/70 bg-surface p-5 sm:p-6">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {isVisible && !shouldLoad && (
        // Section is visible but the reader hasn't loaded the comments yet
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-border/70 bg-surface px-4 py-10 text-center">
          <p className="mb-5 text-base text-muted-foreground">{t("caseDetail.comments.loading")}</p>
          <button
            type="button"
            onClick={handleLoadComments}
            className="inline-flex min-h-11 items-center rounded-full bg-primary-surface px-5 text-[15px] text-primary-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-primary-surface/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("caseDetail.comments.loadComments")}
          </button>
        </div>
      )}

      {shouldLoad && (
        // Disqus widget loaded
        <div className="rounded-[24px] border border-border/70 bg-surface p-4 sm:p-6">
          <LazyDiscussionEmbed
            shortname={disqusShortname}
            config={disqusConfig}
          />
        </div>
      )}
    </section>
  );
}
