import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/Footer";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { GuestCaseChatDrawer } from "@/components/guest/GuestCaseChatDrawer";
import { DocumentSourceCard } from "@/components/DocumentSourceCard";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { FloatingShareSidebar } from "@/components/FloatingShareSidebar";
import { CaseDetailBanner } from "@/components/CaseDetailBanner";
import { CaseTimeline } from "@/components/CaseTimeline";
import { CaseEntityChips } from "@/components/CaseEntityChips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, FileText, AlertTriangle, ArrowLeft, ExternalLink, AlertCircle, Info, Mail, MapPin, MessageCircle, StickyNote, User } from "lucide-react";
import { getCaseById, getDocumentSourceById } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import type { DocumentSource, JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/nes";
import { useQueries, useQuery } from "@tanstack/react-query";
import { formatCaseDateRange } from "@/utils/date";
import { ReportCaseDialog } from "@/components/ReportCaseDialog";
import { DisqusComments } from "@/components/DisqusComments";
import { JAWAFDEHI_WHATSAPP_NUMBER, JAWAFDEHI_EMAIL } from "@/config/constants";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { trackEvent } from "@/utils/analytics";
import { cn } from "@/lib/utils";
import "@/styles/print.css";

const RELATION_PRIORITY: Record<string, number> = {
  accused: 1,
  alleged: 2,
  victim: 3,
  witness: 4,
  related: 5,
  opposition: 6,
  unknown: 10,
};

function getGroupedEntities(entities: JawafEntity[]) {
  const seen = new Set<number>();
  return entities.reduce((groups, entity) => {
    if (seen.has(entity.id) || entity.type === "location") return groups;

    seen.add(entity.id);
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
  const caseId = id ? parseInt(id) : undefined;
  const trackedCaseIdRef = useRef<string | null>(null);
  const [isAskDrawerOpen, setIsAskDrawerOpen] = useState(false);
  const [showAskPopup, setShowAskPopup] = useState(true);
  const [isAskCondensed, setIsAskCondensed] = useState(false);
  const [isIntroFinished, setIsIntroFinished] = useState(false);

  const { data: caseData, isLoading, isError } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => getCaseById(caseId!),
    enabled: caseId != null,
    staleTime: 5 * 60 * 1000,
  });

  const sourceQueries = useQueries({
    queries: (caseData?.evidence ?? []).map((evidence) => ({
      queryKey: ['source', evidence.source_id],
      queryFn: () => getDocumentSourceById(evidence.source_id),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  const uniqueNesIds = caseData
    ? [...new Set(caseData.entities.filter(e => e.nes_id).map(e => e.nes_id!))]
    : [];

  const entityQueries = useQueries({
    queries: uniqueNesIds.map((nesId) => ({
      queryKey: ['nes-entity', nesId],
      queryFn: () => getEntityById(nesId),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  useEffect(() => {
    const loadedCaseId = caseData?.id?.toString();
    if (!id || !loadedCaseId || isError) {
      return;
    }

    if (loadedCaseId !== id || trackedCaseIdRef.current === loadedCaseId) {
      return;
    }

    trackEvent('case_view', { case_id: loadedCaseId, slug: `/case/${id}` });
    trackedCaseIdRef.current = loadedCaseId;
  }, [id, caseData?.id, isError]);

  useEffect(() => {
    if (isAskDrawerOpen) {
      setIsAskCondensed(false);
      setIsIntroFinished(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsAskCondensed(true);
      setIsIntroFinished(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAskDrawerOpen]);

  useEffect(() => {
    if (isAskDrawerOpen) {
      setShowAskPopup(false);
      return;
    }
  }, [isAskDrawerOpen]);

  const resolvedSources: Record<number, DocumentSource> = {};
  (caseData?.evidence ?? []).forEach((evidence, i) => {
    const data = sourceQueries[i]?.data;
    if (data) resolvedSources[evidence.source_id] = data;
  });

  const resolvedEntities: Record<string, Entity> = {};
  uniqueNesIds.forEach((nesId, i) => {
    const data = entityQueries[i]?.data;
    if (data) resolvedEntities[nesId] = data;
  });

  const groupedEntities = caseData
    ? getGroupedEntities(caseData.entities)
    : {};

  const hasInvolvedParties = Object.keys(groupedEntities).length > 0;

  const chatSources = (caseData?.evidence ?? []).map((evidence) => ({
    sourceId: evidence.source_id,
    source: resolvedSources[evidence.source_id] ?? null,
    evidenceDescription: evidence.description,
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main id="main-content" className="flex-1 py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-5xl">
            <Skeleton className="h-10 w-32 mb-6" />
            <div className="space-y-8">
              <div>
                <Skeleton className="h-8 w-3/4 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>

      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main id="main-content" className="flex-1 py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-5xl">
            <Button variant="ghost" asChild className="mb-6">
              <Link to="/cases">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("caseDetail.backToCases")}
              </Link>
            </Button>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isError ? t("caseDetail.failedToLoad") : t("caseDetail.notFound")}
              </AlertDescription>
            </Alert>
          </div>
        </main>

      </div>
    );
  }

  const canonicalUrl = `https://jawafdehi.org/case/${id}`;
  const isAskPopupVisible = showAskPopup && !isAskDrawerOpen;
  const plainDescription = caseData.description
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);
  const metaDescription = plainDescription || caseData.key_allegations.slice(0, 2).join('. ').substring(0, 160);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{caseData.title} | Jawafdehi</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${caseData.title} | Jawafdehi`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta property="article:published_time" content={caseData.created_at} />
        <meta property="article:modified_time" content={caseData.updated_at} />
        {caseData.tags.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${caseData.title} | Jawafdehi`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
        <link rel="alternate" type="application/json" href={`https://portal.jawafdehi.org/api/cases/${id}/`} title="Case data (JSON API)" />
      </Helmet>
      <Header />
      <CaseDetailBanner
        caseData={caseData}
        resolvedEntities={resolvedEntities}
        actions={<ReportCaseDialog caseId={id || ""} caseTitle={caseData.title} />}
      />

      <main id="main-content" className="flex-1 py-8">
        <div className="container mx-auto max-w-8xl px-4">
          <div className={cn(
            "grid gap-8 transition-[grid-template-columns] duration-300 ease-out",
            isAskDrawerOpen && "xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_520px] xl:items-start"
          )}>
            <div className={cn(
              "min-w-0 transition-all duration-300 ease-out",
              isAskDrawerOpen && "order-2 xl:order-1"
            )}>
              <FloatingShareSidebar
                url={canonicalUrl}
                title={caseData.title}
                description={plainDescription}
              />

              <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 no-print">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                  {t("footer.disclaimer")}
                </AlertDescription>
              </Alert>

              {caseData.state === 'IN_REVIEW' && (
                <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 no-print">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200 text-sm">
                    {t("caseDetail.inReviewBanner")}
                  </AlertDescription>
                </Alert>
              )}

              <div id="print-content" className="print-content">
                <div className="mb-8 hidden print:block">
                  <h1 className="text-4xl font-bold text-foreground mb-6">{caseData.title}</h1>

                  {caseData.banner_url && (
                    <img
                      src={caseData.banner_url}
                      alt={caseData.title}
                      className="w-full h-64 object-cover rounded-lg mb-6"
                    />
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start text-muted-foreground">
                      <User className="mr-2 h-5 w-5 flex-shrink-0" />
                      <div className="text-sm flex flex-wrap gap-1">
                        {caseData.entities.filter(e => e.type === 'accused').map((e, index, arr) => {
                          const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                          let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || 'Unknown';
                          displayName = translateDynamicText(displayName, currentLang);
                          return (
                            <span key={e.id}>
                              <Link to={`/entity/${e.id}`} className="text-primary hover:underline">{displayName}</Link>
                              {index < arr.length - 1 && ', '}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="mr-2 h-5 w-5" />
                      <div className="text-sm flex flex-wrap gap-1">
                        {(() => {
                          const locations = caseData.entities.filter(e => e.type === 'location');
                          return locations.length > 0 ? locations.map((e, index) => {
                            const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                            let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || 'Unknown';
                            displayName = translateDynamicText(displayName, currentLang);
                            return (
                              <span key={e.id}>
                                <Link to={`/entity/${e.id}`} className="text-primary hover:underline">{displayName}</Link>
                                {index < locations.length - 1 && ', '}
                              </span>
                            );
                          }) : 'N/A';
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="mr-2 h-5 w-5" />
                      <span className="text-sm">
                        {t("caseDetail.period")}:{" "}
                        {formatCaseDateRange(caseData.case_start_date, caseData.case_end_date, t("cases.status.ongoing"))}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="mb-8 hidden print:block" />

                <div className={cn(
                  "grid gap-8 transition-[grid-template-columns] duration-300 ease-out print:block",
                  caseData.timeline.length > 0 && !isAskDrawerOpen && "lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
                )}>
                  <div className="min-w-0 lg:col-start-1">
                    <Card className="mb-6 sm:mb-8">
                      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
                        <CardTitle className="flex items-center text-xl sm:text-2xl">
                          <AlertTriangle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          {t("caseDetail.allegations")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                        <ul className="space-y-3 sm:space-y-4">
                          {caseData.key_allegations.map((allegation, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-3 rounded-2xl bg-muted/35 p-3 sm:bg-transparent sm:p-0"
                            >
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive sm:h-6 sm:w-6 sm:text-sm">
                                {index + 1}
                              </span>
                              <p className="text-sm leading-7 text-foreground sm:text-base">
                                {allegation}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {hasInvolvedParties && (
                      <section className="mb-8">
                        <h2 className="mb-5 text-2xl font-semibold text-foreground">
                          {t("caseDetail.partiesInvolved")}
                        </h2>

                        <div className="space-y-8">
                          {(() => {
                            const unknownLabel = t("caseDetail.relationTypes.unknown");
                            return Object.entries(groupedEntities)
                              .sort(([typeA], [typeB]) => (RELATION_PRIORITY[typeA] ?? 99) - (RELATION_PRIORITY[typeB] ?? 99))
                              .map(([type, entities]) => {
                                // Compute label for each relation type
                                const typeKey = `caseDetail.relationTypes.${type}`;
                                const label = t(typeKey, { defaultValue: unknownLabel });

                                return (
                                  <div key={type} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                      {label}
                                    </h3>
                                    <div className="h-px w-full bg-border/60" />
                                  </div>
                                  <CaseEntityChips
                                    entities={entities}
                                    resolvedEntities={resolvedEntities}
                                    language={currentLang}
                                  />
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </section>
                    )}
                  </div>

                  <CaseTimeline
                    timeline={caseData.timeline}
                    title={t("caseDetail.timeline")}
                    className={cn(
                      "print:static print:mb-8 lg:col-start-2 lg:row-start-1 lg:row-span-2",
                      isAskDrawerOpen ? "hidden print:block" : "mb-8 text-foreground"
                    )}
                  />

                  <div className="min-w-0 lg:col-start-1">
                    <Card className="mb-8">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="mr-2 h-5 w-5" />
                          {t("caseDetail.overview")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-hidden">
                        <ResponsiveTable html={caseData.description} />
                      </CardContent>
                    </Card>

                    {caseData.evidence.length > 0 && (
                      <Card className="mb-8">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <FileText className="mr-2 h-5 w-5" />
                            {t("caseDetail.evidence")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div>
                            {caseData.evidence.map((evidence, index) => {
                              const source = resolvedSources[evidence.source_id] ?? null;
                              return (
                                <DocumentSourceCard
                                  key={`${evidence.source_id}-${index}`}
                                  source={source}
                                  sourceId={evidence.source_id}
                                  itemNumber={index + 1}
                                  evidenceDescription={evidence.description}
                                />
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {caseData.missing_details && (
                      <section className="mb-8 border-t border-border pt-5">
                        <h2 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <Info className="mr-2 h-4 w-4" />
                          {t("caseDetail.missingDetails")}
                        </h2>
                        <div className="overflow-hidden text-sm leading-7 text-muted-foreground">
                          <ResponsiveTable html={caseData.missing_details} />
                        </div>
                      </section>
                    )}

                    {caseData.notes && (
                      <section className="mb-8 border-t border-border pt-5">
                        <h2 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <StickyNote className="mr-2 h-4 w-4" />
                          {t("caseDetail.notes")}
                        </h2>
                        <div className="overflow-hidden text-sm leading-7 text-muted-foreground">
                          <ResponsiveTable html={caseData.notes} />
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30 no-print">
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="font-semibold text-lg">{t("caseDetail.contact")}</h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span className="mt-1">{t("caseDetail.emailLabel")}: {JAWAFDEHI_EMAIL}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span className="mt-1">{t("caseDetail.whatsappLabel")}: {JAWAFDEHI_WHATSAPP_NUMBER}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="lg" asChild className="shrink-0">
                  <a
                    href={`https://portal.jawafdehi.org/admin/cases/case/${id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="mt-1.5">{t("caseDetail.editCase")}</span>
                  </a>
                </Button>
              </div>

              <DisqusComments
                caseId={id || ""}
                caseTitle={caseData.title}
                caseUrl={canonicalUrl}
              />
            </div>

            {isAskDrawerOpen ? (
              <div className="order-1 min-w-0 animate-in fade-in-0 slide-in-from-right-4 duration-300 xl:order-2 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
                <GuestCaseChatDrawer
                  caseId={caseData.id}
                  caseTitle={caseData.title}
                  caseData={caseData}
                  sources={chatSources}
                  open={isAskDrawerOpen}
                  onOpenChange={setIsAskDrawerOpen}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <div
        className={cn(
          "pointer-events-none fixed bottom-5 z-40 flex transition-all duration-300 no-print right-4 sm:right-6 xl:right-10",
          isAskPopupVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        )}
        aria-hidden={!isAskPopupVisible}
      >
        <button
          type="button"
          onClick={() => setIsAskDrawerOpen(true)}
          onMouseEnter={() => isIntroFinished && setIsAskCondensed(false)}
          onMouseLeave={() => isIntroFinished && setIsAskCondensed(true)}
          aria-label={t("caseDetail.askPopupTitle")}
          tabIndex={isAskPopupVisible ? 0 : -1}
          className={cn(
            "pointer-events-auto flex items-center rounded-full border border-primary bg-background/95 p-3 text-left shadow-[0_18px_40px_rgba(15,23,42,0.14),0_0_0_1px_rgba(37,99,235,0.06),0_0_24px_rgba(37,99,235,0.12)] ring-1 ring-primary backdrop-blur transition-all duration-500 ease-in-out hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_22px_44px_rgba(15,23,42,0.16),0_0_0_1px_rgba(37,99,235,0.08),0_0_30px_rgba(37,99,235,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:shadow-[0_22px_44px_rgba(15,23,42,0.16),0_0_0_1px_rgba(37,99,235,0.1),0_0_0_6px_rgba(37,99,235,0.14),0_0_34px_rgba(37,99,235,0.2)] supports-[backdrop-filter]:bg-background/90",
            isAskCondensed 
              ? "w-[74px] h-[74px] overflow-hidden justify-center" 
              : "w-[calc(100vw-2rem)] max-w-[24rem] sm:w-[22rem]"
          )}
        >
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className={cn(
            "min-w-0 flex-1 transition-all duration-500 ease-in-out",
            isAskCondensed ? "max-w-0 opacity-0 invisible" : "max-w-[18rem] opacity-100 visible pl-3"
          )}>
            <span className="block truncate text-sm font-semibold text-foreground">
              {t("caseDetail.askPopupTitle")}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {t("caseDetail.askPopupDescription")}
            </span>
          </span>
        </button>
      </div>

      <Footer />


    </div>
  );
};

export default CaseDetail;
