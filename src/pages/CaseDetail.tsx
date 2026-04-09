import { useEffect, useRef } from "react";
import { Footer } from "@/components/Footer";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { DocumentSourceCard } from "@/components/DocumentSourceCard";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { FloatingShareSidebar } from "@/components/FloatingShareSidebar";
import { InlineShareButtons } from "@/components/InlineShareButtons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, User, FileText, AlertTriangle, ArrowLeft, ExternalLink, AlertCircle, Info, Mail, MessageCircle, StickyNote } from "lucide-react";
import { getCaseById, getDocumentSourceById } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import type { DocumentSource } from "@/types/jds";
import type { Entity } from "@/types/nes";
import { useQueries, useQuery } from "@tanstack/react-query";
import { formatDateWithBS, formatCaseDateRange } from "@/utils/date";
import { ReportCaseDialog } from "@/components/ReportCaseDialog";
import { DisqusComments } from "@/components/DisqusComments";
import { JAWAFDEHI_WHATSAPP_NUMBER, JAWAFDEHI_EMAIL } from "@/config/constants";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { trackEvent } from "@/utils/analytics";
import "@/styles/print.css";


const CaseDetail = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { id } = useParams();
  const caseId = id ? parseInt(id) : undefined;
  const trackedCaseIdRef = useRef<string | null>(null);

  // Fetch case data
  const { data: caseData, isLoading, isError } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => getCaseById(caseId!),
    enabled: caseId != null,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all evidence sources in parallel once we have case data
  const sourceQueries = useQueries({
    queries: (caseData?.evidence ?? []).map((evidence) => ({
      queryKey: ['source', evidence.source_id],
      queryFn: () => getDocumentSourceById(evidence.source_id),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  // Fetch all NES entities in parallel
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

  // Track once per loaded case id to avoid duplicates while excluding error/404 views
  useEffect(() => {
    const loadedCaseId = caseData?.id?.toString();
    if (!id || !loadedCaseId || isError) {
      return;
    }

    if (loadedCaseId !== id || trackedCaseIdRef.current === loadedCaseId) {
      return;
    }

    trackEvent('case_view', { case_id: loadedCaseId });
    trackedCaseIdRef.current = loadedCaseId;
  }, [id, caseData?.id, isError]);

  // Build lookup maps
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12">
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
        <main className="flex-1 py-12">
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

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 mb-4 no-print">
            <Button variant="outline" asChild>
              <Link to="/cases">
                <ArrowLeft className="h-4 w-4" />
                <span className="mt-[5px]">
                  {t("caseDetail.backToCases")}
                </span>
              </Link>
            </Button>

            <div className="flex gap-2">
              <ReportCaseDialog caseId={id || ""} caseTitle={caseData.title} />
            </div>
          </div>

          {/* Floating share sidebar - desktop only */}
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

          {/* PRINTABLE CONTENT STARTS HERE */}
          <div id="print-content" className="print-content">
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-4 no-print">
                <Badge className="bg-alert text-alert-foreground">
                  {(() => {
                    // Map caseData.state to translation key
                    const stateMap: Record<string, string> = {
                      'DRAFT': 'caseDetail.status.underInvestigation',
                      'IN_REVIEW': 'caseDetail.status.underInvestigation',
                      'PUBLISHED': 'caseDetail.status.ongoing',
                      'CLOSED': 'caseDetail.status.resolved'
                    };
                    const statusKey = caseData.state ? stateMap[caseData.state] : 'caseDetail.status.ongoing';
                    return t(statusKey || 'caseDetail.status.ongoing');
                  })()}
                </Badge>
                <Badge variant="outline" className={caseData.case_type === 'CORRUPTION' ? 'bg-destructive/20 text-destructive' : 'bg-orange-500/20 text-orange-700'}>
                  {caseData.case_type === 'CORRUPTION' ? t("cases.type.corruption") : t("cases.type.brokenPromise")}
                </Badge>
                {caseData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
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

          <Separator className="mb-8" />

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                {t("caseDetail.allegations")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {caseData.key_allegations.map((allegation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-destructive text-sm font-semibold mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{allegation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {caseData.entities.filter(e => e.type === 'related').length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t("caseDetail.partiesInvolved")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {caseData.entities.filter(e => e.type === 'related').map((e, index, arr) => {
                    const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                    let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || 'Unknown';
                    displayName = translateDynamicText(displayName, currentLang);
                    return (
                      <span key={index}>
                        <Link to={`/entity/${e.id}`} className="text-primary hover:underline">{displayName}</Link>
                        {index < arr.length - 1 && ', '}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {caseData.timeline.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t("caseDetail.timeline")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {caseData.timeline.map((item, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex flex-col items-center mr-4 min-h-full">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        {index !== caseData.timeline.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-6">
                        <p className="text-sm font-semibold text-foreground mb-1">{formatDateWithBS(item.date)}</p>
                        <p className="text-sm font-medium text-foreground mb-1 break-words">{item.title}</p>
                        <p className="text-sm text-muted-foreground break-words">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                <div className="space-y-3">
                  {caseData.evidence.map((evidence, index) => {
                    const source = resolvedSources[evidence.source_id] ?? null;
                    return (
                      <DocumentSourceCard
                        key={`${evidence.source_id}-${index}`}
                        source={source}
                        sourceId={evidence.source_id}
                        evidenceDescription={evidence.description}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator className="my-8" />

          {caseData.notes && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <StickyNote className="mr-2 h-5 w-5" />
                  {t("caseDetail.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <ResponsiveTable html={caseData.notes} />
              </CardContent>
            </Card>
          )}

          </div>
          {/* PRINTABLE CONTENT ENDS HERE */}

          {/* Share This Case Section - Bottom of article */}
          <div 
            id="bottom-share-section"
            className="flex flex-col items-center gap-4 py-8 mb-8 border-y border-border no-print"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {t("share.shareThisCase")}
            </p>
            <InlineShareButtons
              url={canonicalUrl}
              title={caseData.title}
              description={plainDescription}
            />
          </div>

          {/* Contact and Edit Section - NOT PRINTED */}
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

          {/* Public Discussion / Comments Section */}
          <DisqusComments
            caseId={id || ""}
            caseTitle={caseData.title}
            caseUrl={canonicalUrl}
          />
        </div>
      </main>

      <Footer />


    </div>
  );
};

export default CaseDetail;
