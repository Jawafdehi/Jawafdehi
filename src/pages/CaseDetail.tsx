import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { FloatingShareSidebar } from "@/components/FloatingShareSidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { CaseDetailBanner } from "@/components/case-detail/case-detail-banner";
import { CaseContactStrip } from "@/components/case-detail/case-contact-strip";
import { CaseDisclaimerBanner } from "@/components/case-detail/case-disclaimer-banner";
import { CaseOverviewSection } from "@/components/case-detail/case-overview-section";
import { CaseSectionJumpNav, type CaseJumpSection } from "@/components/case-detail/case-section-jump-nav";
import { MissingDetailsSection } from "@/components/case-detail/missing-details-section";
import { NotesSection } from "@/components/case-detail/notes-section";
import { CaseTimelineSection } from "@/components/case-detail/case-timeline-section";
import { MobileShareExpander } from "@/components/case-detail/mobile-share-expander";
import { CourtCasesSection } from "@/components/case-detail/court-cases-section";
import { EvidenceSection } from "@/components/case-detail/evidence-section";
import { InvolvedPartiesSection } from "@/components/case-detail/involved-parties-section";
import { KeyAllegationsSection } from "@/components/case-detail/key-allegations-section";
import { getCaseById, getCaseByCourtRef } from "@/services/jds-api";
import { API_BASE_URL } from "@/services/http";
import { getCourtCase } from "@/services/datalake-api";
import { getEntityById } from "@/services/api";
import type { CourtCase, JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";
import { useQueries, useQuery } from "@tanstack/react-query";
import { formatCaseDateRangeForLanguage } from "@/utils/date";
import { stripMarkdown } from "@/utils/markdown";
import { previewImageUrl, SITE_NAME, SITE_URL, SOCIAL_IMAGE_URL, stripHtml, truncateMeta } from "@/utils/seo";
import { getSubjectEntities } from "@/utils/case-entities";
import { ReportCaseDialog } from "@/components/ReportCaseDialog";
import { DisqusComments } from "@/components/DisqusComments";
import { JAWAFDEHI_WHATSAPP_NUMBER, JAWAFDEHI_EMAIL } from "@/config/constants";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { trackEvent } from "@/utils/analytics";
import { entityPath } from "@/lib/entity-links";
import { formatBigo } from "@/utils/number";
import { resolveLegacyCaseSlug } from "@/utils/legacyCaseMap";
import { isCourtCaseRef } from "@/utils/courtCaseRef";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import "@/styles/print.css";

function getGroupedEntities(entities: JawafEntity[]) {
  // Case entities are keyed on their NES @id IRI (the backend no longer returns
  // a numeric id). Fall back to display_name so id-less binds still dedupe.
  const seen = new Set<string>();
  return entities.reduce((groups, entity) => {
    const key = entity.nes_id ?? entity.display_name ?? "";
    if ((key && seen.has(key)) || entity.type === "location") return groups;

    if (key) seen.add(key);
    const type = entity.type || "unknown";

    if (!groups[type]) groups[type] = [];
    groups[type].push(entity);

    return groups;
  }, {} as Record<string, JawafEntity[]>);
}

const CaseDetail = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { id } = useParams();
  const navigate = useNavigate();
  const trackedCaseIdRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState("allegations");
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Legacy /case/<numeric> URLs: resolve to canonical slug and replace.
  // Mirrors worker.ts behaviour for environments without the Cloudflare edge
  // (local dev, preview deploys, direct hits that bypass the worker).
  const legacyTargetSlug = resolveLegacyCaseSlug(id);

  // /case/<court-ref> URLs (e.g. /case/081-CR-0116): resolved via the by-court-ref
  // API, then replaced with the canonical slug below once the case loads.
  const isCourtRef = isCourtCaseRef(id);

  const { data: caseData, isLoading, isError } = useQuery({
    queryKey: ["case", id],
    queryFn: () => (isCourtRef ? getCaseByCourtRef(id!) : getCaseById(id!)),
    enabled: id != null && legacyTargetSlug == null,
    staleTime: 5 * 60 * 1000,
  });

  // BB-38: follow the canonical slug once the case loads. The API 301-redirects
  // stale/old slugs to the current one and `fetch` follows the redirect
  // transparently, so `caseData.slug` is always canonical. When it differs from
  // the route param — a stale slug, a legacy numeric id, or a /case/<court-ref>
  // URL — replace the URL so the user lands on /case/<current-slug> without
  // adding a history entry. Guarded to only fire when the slug is truthy and
  // actually different, which prevents redirect loops once the URL is canonical.
  useEffect(() => {
    const canonicalSlug = caseData?.slug;
    if (canonicalSlug && canonicalSlug !== id) {
      navigate(`/case/${canonicalSlug}`, { replace: true });
    }
  }, [caseData?.slug, id, navigate]);

  // Subject entities: accused for CORRUPTION cases, else any named (non-location)
  // entity so cases without an accused (e.g. TAX_EVASION) still name a subject.
  const bannerEntities = getSubjectEntities(caseData?.entities, (e) => e.type);
  const accusedCount = bannerEntities.length;
  const BANNER_ACCUSED_LIMIT = 5;
  const collapsedAccused = accusedCount > BANNER_ACCUSED_LIMIT;
  const visibleAccusedEntities = collapsedAccused ? bannerEntities.slice(0, BANNER_ACCUSED_LIMIT) : bannerEntities;
  const hiddenAccusedCount = accusedCount - visibleAccusedEntities.length;

  const uniqueNesIds = caseData
    ? [...new Set(caseData.entities.filter((e) => e.nes_id).map((e) => e.nes_id!))]
    : [];

  const entityQueries = useQueries({
    queries: uniqueNesIds.map((nesId) => ({
      queryKey: ["entity-record", nesId],
      queryFn: () => getEntityById(nesId),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  const courtCaseQueries = useQueries({
    queries: (caseData?.court_cases ?? []).map((courtCaseId) => ({
      queryKey: ["court-case", courtCaseId],
      queryFn: () => getCourtCase(courtCaseId),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  useEffect(() => {
    const loadedCaseId = caseData?.id?.toString();
    const canonicalSlug = caseData?.slug;

    if (!id || !loadedCaseId || !canonicalSlug || isError) {
      return;
    }

    // Only fire once we're on the case's canonical slug URL. This skips the
    // brief pre-canonical render for legacy /case/<numeric>, /case/<court-ref>,
    // and stale-slug URLs (the effect re-runs after navigate() lands on the
    // canonical slug). The previous guard compared the *numeric* caseData.id to
    // the *slug* route param — once cases moved to slug URLs those never matched,
    // so case_view silently stopped firing (0 events for ~2 months).
    if (canonicalSlug !== id || trackedCaseIdRef.current === loadedCaseId) {
      return;
    }

    trackEvent("case_view", { case_id: loadedCaseId, slug: `/case/${canonicalSlug}` });
    trackedCaseIdRef.current = loadedCaseId;
  }, [id, caseData?.id, caseData?.slug, isError]);

  const resolvedEntities: Record<string, Entity> = {};
  uniqueNesIds.forEach((nesId, i) => {
    const data = entityQueries[i]?.data;
    if (data) resolvedEntities[nesId] = data;
  });

  const groupedEntities = caseData ? getGroupedEntities(caseData.entities) : {};

  const hasInvolvedParties = Object.keys(groupedEntities).length > 0;
  const hasTimeline = (caseData?.timeline || []).length > 0;
  const hasCourtCases = (caseData?.court_cases ?? []).length > 0;
  const hasEvidence = (caseData?.evidence ?? []).length > 0;
  const hasMissingDetails = Boolean(caseData?.missing_details);
  const hasNotes = Boolean(caseData?.notes);

  const jumpSections = useMemo<CaseJumpSection[]>(() => {
    const sections: Array<CaseJumpSection | false> = [
      { id: "allegations", label: t("caseDetail.allegations") },
      hasInvolvedParties && { id: "parties-involved", label: t("caseDetail.partiesInvolved") },
      hasTimeline && { id: "timeline", label: t("caseDetail.timeline") },
      { id: "overview", label: t("caseDetail.overview") },
      hasCourtCases && { id: "court-case", label: t("caseDetail.courtUpdates", "Court updates") },
      hasEvidence && { id: "evidence", label: t("caseDetail.evidence") },
      hasMissingDetails && { id: "missing-details", label: t("caseDetail.missingDetails") },
      hasNotes && { id: "notes", label: t("caseDetail.notes") },
    ];

    return sections.filter((section): section is CaseJumpSection => Boolean(section));
  }, [
    hasCourtCases,
    hasEvidence,
    hasInvolvedParties,
    hasMissingDetails,
    hasNotes,
    hasTimeline,
    t,
  ]);

  useEffect(() => {
    if (!caseData || jumpSections.length === 0) return;

    setActiveSection((currentSection) =>
      jumpSections.some((section) => section.id === currentSection) ? currentSection : jumpSections[0].id
    );

    const sectionElements = jumpSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) return;

    let animationFrame = 0;

    const updateActiveSection = () => {
      animationFrame = 0;

      const readingLine = window.innerHeight * 0.5;
      let currentSectionId = sectionElements[0].id;

      for (const element of sectionElements) {
        if (element.getBoundingClientRect().top <= readingLine) {
          currentSectionId = element.id;
        } else {
          break;
        }
      }

      const isAtPageBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (isAtPageBottom) {
        currentSectionId = sectionElements[sectionElements.length - 1].id;
      }

      setActiveSection((currentSection) =>
        currentSection === currentSectionId ? currentSection : currentSectionId
      );
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [caseData, jumpSections]);

  const handleJumpToSection = (sectionId: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    const target = document.getElementById(sectionId);
    if (!target) return;

    setActiveSection(sectionId);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    // Route the scroll-spy hash through React Router (replace, no new entry) so
    // it resolves against the current route rather than the document <base
    // href="/">. A raw window.history.replaceState("#id") would rewrite the path
    // to "/#id" and desync the back-stack, sending Back to the wrong page.
    navigate(`#${sectionId}`, { replace: true });
  };

  const handleBannerShare = async () => {
    if (!caseData) return;

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (isDesktop) {
      setIsShareOpen(true);
      return;
    }

    const shareData = {
      title: caseData.title,
      text: plainDescription,
      url: canonicalUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(canonicalUrl);
      toast.success(t("share.linkCopied"));
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error(t("share.copyFailed"));
    }
  };

  // Legacy /case/<numeric> URLs: replace with the canonical slug. This must
  // happen after all hooks have run so we don't violate rules-of-hooks.
  if (legacyTargetSlug) {
    return <Navigate to={`/case/${legacyTargetSlug}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
        <div className="flex-1 py-6 md:py-12">
          <div className="container mx-auto max-w-5xl px-6">
            <Skeleton className="mb-6 h-10 w-32" />

            <div className="space-y-8">
              <div>
                <Skeleton className="mb-4 h-8 w-3/4" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>

              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
        <div className="flex-1 py-6 md:py-12">
          <div className="container mx-auto max-w-5xl px-6">
            <Button variant="ghost" asChild className="mb-6">
              <Link to="/cases">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("caseDetail.backToCases")}
              </Link>
            </Button>

            <Alert variant="destructive" className="items-start">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <AlertDescription className="break-words">
                {isError ? t("caseDetail.failedToLoad") : t("caseDetail.notFound")}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  const canonicalCaseSlug = caseData.slug || id;
  const canonicalUrl = `${SITE_URL}/case/${canonicalCaseSlug}`;
  const plainDescription = truncateMeta(stripMarkdown(stripHtml(caseData.description)));
  const allegationDescription = truncateMeta(caseData.key_allegations?.slice(0, 2).join(". "));
  const metaDescription = plainDescription || allegationDescription || "";
  const metaTitle = `${caseData.title} | Jawafdehi`;
  const ogImage =
    previewImageUrl(caseData.banner_url, "https://portal.jawafdehi.org") ||
    previewImageUrl(caseData.thumbnail_url, "https://portal.jawafdehi.org") ||
    SOCIAL_IMAGE_URL;

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        {/* Non-PUBLISHED cases are "unlisted": reachable by direct slug but kept
            out of search engines (the API serves IN_REVIEW by slug, but these are
            provisional, pre-publication records — see the under-review banner). */}
        {caseData.state !== "PUBLISHED" && (
          <meta name="robots" content="noindex, nofollow" />
        )}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={caseData.title} />
        <meta property="og:locale" content="en_US" />
        <meta property="article:published_time" content={caseData.created_at} />
        <meta property="article:modified_time" content={caseData.updated_at} />
        {caseData.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={caseData.title} />
        <link
          rel="alternate"
          type="application/json"
          href={`${API_BASE_URL}/api/cases/${id}/`}
          title="Case data (JSON API)"
        />
        <link
          rel="alternate"
          type="application/json+oembed"
          href={`https://jawafdehi.org/oembed/?url=${encodeURIComponent(canonicalUrl)}&format=json`}
          title={`${caseData.title} oEmbed`}
        />
      </Helmet>

      <CaseDetailBanner
        caseData={caseData}
        resolvedEntities={resolvedEntities}
        actions={<ReportCaseDialog caseId={id || ""} caseTitle={caseData.title} />}
        shareAction={{
          label: t("caseDetail.shareCase"),
          onClick: handleBannerShare,
        }}
      />

      <div className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-6">
          <div className="min-w-0">
            <div className="min-w-0">
              <FloatingShareSidebar
                url={canonicalUrl}
                title={caseData.title}
                description={plainDescription}
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
              />

              <CaseDisclaimerBanner>{t("footer.disclaimer")}</CaseDisclaimerBanner>

              {caseData.state === "IN_REVIEW" && (
                <Alert className="no-print mb-5 items-start border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 sm:mb-6">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="break-words text-sm text-yellow-800 dark:text-yellow-200">
                    {t("caseDetail.inReviewBanner")}
                  </AlertDescription>
                </Alert>
              )}

              <div id="print-content" className="print-content min-w-0">
                <div className="mb-8 hidden print:block">
                  <h1 className="mb-6 text-4xl font-bold text-foreground">{caseData.title}</h1>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start text-muted-foreground">
                      <span className="mr-2 font-semibold">{t("caseDetail.relationTypes.accused")}:</span>
                      <div className="flex flex-wrap gap-1 text-sm">
                        {visibleAccusedEntities.map((e, index, arr) => {
                          const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                          let displayName =
                            entity?.names?.[0]?.en?.full ||
                            entity?.names?.[0]?.ne?.full ||
                            e.display_name ||
                            e.nes_id ||
                            t("common.notAvailable");

                          displayName = translateDynamicText(displayName, currentLang);

                          // Entities are keyed/linked by their NES @id IRI; id-less
                          // binds render as plain text (no profile to link to).
                          const key = e.nes_id ?? `${e.display_name ?? "entity"}-${index}`;
                          const to = entityPath(e.nes_id);

                          return (
                            <span key={key}>
                              {to ? (
                                <Link to={to} className="text-primary hover:underline">
                                  {displayName}
                                </Link>
                              ) : (
                                <span className="text-foreground">{displayName}</span>
                              )}
                              {index < arr.length - 1 && ", "}
                            </span>
                          );
                        })}

                        {collapsedAccused && (
                          <span className="text-muted-foreground">
                            {t("caseDetail.andMoreAccused", { count: hiddenAccusedCount })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center text-muted-foreground">
                      <span className="mr-2 font-semibold">{t("caseDetail.location")}:</span>
                      <div className="flex flex-wrap gap-1 text-sm">
                        {(() => {
                          const locations = caseData.entities.filter((e) => e.type === "location");

                          return locations.length > 0
                            ? locations.map((e, index) => {
                                const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                                let displayName =
                                  entity?.names?.[0]?.en?.full ||
                                  entity?.names?.[0]?.ne?.full ||
                                  e.display_name ||
                                  e.nes_id ||
                                  t("common.notAvailable");

                                displayName = translateDynamicText(displayName, currentLang);

                                const key = e.nes_id ?? `${e.display_name ?? "location"}-${index}`;
                                const to = entityPath(e.nes_id);

                                return (
                                  <span key={key}>
                                    {to ? (
                                      <Link to={to} className="text-primary hover:underline">
                                        {displayName}
                                      </Link>
                                    ) : (
                                      <span className="text-foreground">{displayName}</span>
                                    )}
                                    {index < locations.length - 1 && ", "}
                                  </span>
                                );
                              })
                            : t("common.notAvailable");
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center text-muted-foreground">
                      <span className="text-sm">
                        {t("caseDetail.period")}:{" "}
                        {(() => {
                          const dateRange = formatCaseDateRangeForLanguage(
                            caseData.case_start_date,
                            caseData.case_end_date,
                            t("cases.status.ongoing"),
                            currentLang
                          );

                          return (
                            <>
                              {dateRange.primary}
                              {dateRange.secondary && (
                                <>
                                  <br />
                                  ({dateRange.secondary})
                                </>
                              )}
                            </>
                          );
                        })()}
                      </span>
                    </div>

                    {caseData.bigo != null && caseData.bigo > 0 && (
                      <div className="flex items-center text-muted-foreground">
                        <span className="text-sm">
                          {t("caseDetail.embezzledAmount")}: {formatBigo(caseData.bigo)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="mb-8 hidden print:block" />

                <div className="grid min-w-0 gap-6 print:block lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-12">
                  <aside className="hidden lg:block min-w-0 lg:col-start-1 lg:row-start-1">
                    <CaseSectionJumpNav
                      activeSection={activeSection}
                      onJump={handleJumpToSection}
                      sections={jumpSections}
                    />
                  </aside>

                  <div className="min-w-0 w-full max-w-6xl lg:col-start-2 lg:pl-8 xl:pl-24">
                    <KeyAllegationsSection
                      allegations={caseData.key_allegations || []}
                      emptyLabel={t("common.notAvailable")}
                      title={t("caseDetail.allegations")}
                    />

                    {hasInvolvedParties && (
                      <InvolvedPartiesSection
                        groupedEntities={groupedEntities}
                        language={currentLang}
                        resolvedEntities={resolvedEntities}
                        title={t("caseDetail.partiesInvolved")}
                        translateRelation={(relationType) =>
                          t(`caseDetail.relationTypes.${relationType}`, {
                            defaultValue: t("caseDetail.relationTypes.unknown"),
                          })
                        }
                      />
                    )}

                    {hasTimeline && (
                      <CaseTimelineSection
                        className="mb-12 print:static print:mb-8"
                        language={currentLang}
                        timeline={caseData.timeline || []}
                        title={t("caseDetail.timeline")}
                      />
                    )}

                    <CaseOverviewSection description={caseData.description} title={t("caseDetail.overview")} />

                    <CourtCasesSection
                      courtCases={(caseData.court_cases ?? []).map((courtCaseId, index) => {
                        const query = courtCaseQueries[index];

                        return {
                          courtCase: query?.data as CourtCase | undefined,
                          id: courtCaseId,
                          isLoading: query?.isLoading ?? false,
                        };
                      })}
                      title={t("caseDetail.courtUpdates", "Court updates")}
                    />

                    <EvidenceSection
                      evidence={caseData.evidence}
                      title={t("caseDetail.evidence")}
                    />

                    <MissingDetailsSection
                      html={caseData.missing_details}
                      title={t("caseDetail.missingDetails")}
                    />

                    <NotesSection
                      html={caseData.notes}
                      title={t("caseDetail.notes")}
                    />
                  </div>
                </div>
              </div>

              <CaseContactStrip
                email={JAWAFDEHI_EMAIL}
                whatsappNumber={JAWAFDEHI_WHATSAPP_NUMBER}
                editUrl={`${API_BASE_URL}/admin/cases/case/${id}/change/`}
                emailLabel={t("caseDetail.emailLabel")}
                whatsappLabel={t("caseDetail.whatsappLabel")}
                editLabel={t("caseDetail.editCase")}
                title={t("caseDetail.contact")}
              />

              <DisqusComments caseId={id || ""} caseTitle={caseData.title} caseUrl={canonicalUrl} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Share Button */}
      {isMobile && (
        <div className="no-print pointer-events-auto fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3 z-40 sm:right-6">
          <MobileShareExpander
            url={canonicalUrl}
            title={caseData.title}
            description={plainDescription}
          />
        </div>
      )}
    </div>
  );
};

export default CaseDetail;
