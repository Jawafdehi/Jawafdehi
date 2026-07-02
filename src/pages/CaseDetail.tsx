import { useEffect, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { DocumentSourceCard } from "@/components/DocumentSourceCard";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeColspan, { padColspanTableHeaders } from "@/utils/rehype-colspan";
import { CourtCaseCard } from "@/components/CourtCaseCard";
import { FloatingShareSidebar } from "@/components/FloatingShareSidebar";
import { ShareButton } from "@/components/ShareButton";
import { CaseDetailBanner } from "@/components/CaseDetailBanner";
import { CaseTimeline } from "@/components/CaseTimeline";
import { CaseEntityChips } from "@/components/CaseEntityChips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Banknote, Calendar, FileText, AlertTriangle, ArrowLeft, ExternalLink, AlertCircle, Info, Mail, MapPin, MessageCircle, Scale, StickyNote, User, Share2 } from "lucide-react";
import { getCaseById, getCaseByCourtRef } from "@/services/jds-api";
import { API_BASE_URL } from "@/services/http";
import { getCourtCase } from "@/services/datalake-api";
import { getEntityById } from "@/services/api";
import type { CourtCase, JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";
import { useQueries, useQuery } from "@tanstack/react-query";
import { formatCaseDateRange } from "@/utils/date";
import { stripMarkdown } from "@/utils/markdown";
import { getSubjectEntities } from "@/utils/case-entities";
import { ReportCaseDialog } from "@/components/ReportCaseDialog";
import { DisqusComments } from "@/components/DisqusComments";
import { JAWAFDEHI_WHATSAPP_NUMBER, JAWAFDEHI_EMAIL } from "@/config/constants";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { trackEvent } from "@/utils/analytics";
import { cn } from "@/lib/utils";
import { entityPath } from "@/lib/entity-links";
import { formatBigo } from "@/utils/number";
import { resolveLegacyCaseSlug } from "@/utils/legacyCaseMap";
import { isCourtCaseRef } from "@/utils/courtCaseRef";
import { useIsMobile } from "@/hooks/use-mobile";
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

// Evidence tier grouping types and constants
type EvidenceGroup = 'primary' | 'legal' | 'secondary';

const PRIMARY_TYPES: readonly string[] = [
  'OFFICIAL_GOVERNMENT',
  'FINANCIAL_FORENSIC',
  'INTERNAL_CORPORATE',
  'INVESTIGATIVE_REPORT'
] as const;

const LEGAL_TYPES: readonly string[] = [
  'LEGAL_COURT_ORDER',
  'LEGAL_PROCEDURAL',
  'LEGISLATIVE_DOC'
] as const;

const SECONDARY_TYPES: readonly string[] = [
  'MEDIA_NEWS',
  'PUBLIC_COMPLAINT',
  'SOCIAL_MEDIA',
  'OTHER_VISUAL'
] as const;

/**
 * Classifies a document source into an evidentiary tier based on source_type.
 * 
 * @param sourceType - The source_type field from DocumentSource (can be null/undefined)
 * @returns The evidence group: 'primary', 'legal', or 'secondary'
 */
function getEvidenceGroup(sourceType: string | null | undefined): EvidenceGroup {
  if (!sourceType) return 'secondary';
  
  if (PRIMARY_TYPES.includes(sourceType)) return 'primary';
  if (LEGAL_TYPES.includes(sourceType)) return 'legal';
  if (SECONDARY_TYPES.includes(sourceType)) return 'secondary';
  
  // Unknown source_type defaults to secondary
  return 'secondary';
}

interface SectionHeaderProps {
  group: EvidenceGroup;
  count: number;
  t: (key: string, options?: { count?: number }) => string;
}

/**
 * Section header component for evidence tier grouping.
 * Displays a badge with tier-specific colors and document count.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ group, count, t }) => {
  const config = {
    primary: {
      bgColor: 'bg-[#E6F1FB] dark:bg-blue-950/30',
      textColor: 'text-[#0C447C] dark:text-blue-300',
      labelKey: 'caseDetail.evidenceGroups.primary'
    },
    legal: {
      bgColor: 'bg-[#EEEDFE] dark:bg-purple-950/30',
      textColor: 'text-[#3C3489] dark:text-purple-300',
      labelKey: 'caseDetail.evidenceGroups.legal'
    },
    secondary: {
      bgColor: 'bg-[#F1EFE8] dark:bg-gray-800/30',
      textColor: 'text-[#5F5E5A] dark:text-gray-300',
      labelKey: 'caseDetail.evidenceGroups.secondary'
    }
  };

  const { bgColor, textColor, labelKey } = config[group];

  return (
    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bgColor} ${textColor}`}>
        {t(labelKey)}
      </span>
      <span className="text-sm text-muted-foreground">
        {t('caseDetail.evidenceGroups.documentCount', { count })}
      </span>
    </div>
  );
};

const CaseDetail = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { id } = useParams();
  const trackedCaseIdRef = useRef<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const isMobile = useIsMobile();

  // Legacy /case/<numeric> URLs: resolve to canonical slug and replace.
  // Mirrors worker.ts behaviour for environments without the Cloudflare edge
  // (local dev, preview deploys, direct hits that bypass the worker).
  const legacyTargetSlug = resolveLegacyCaseSlug(id);

  // /case/<court-ref> URLs (e.g. /case/081-CR-0116): resolved via the by-court-ref
  // API, then replaced with the canonical slug below once the case loads.
  const isCourtRef = isCourtCaseRef(id);

  const { data: caseData, isLoading, isError } = useQuery({
    queryKey: ['case', id],
    queryFn: () => (isCourtRef ? getCaseByCourtRef(id!) : getCaseById(id!)),
    enabled: id != null && legacyTargetSlug == null,
    staleTime: 5 * 60 * 1000,
  });

  // Subject entities: accused for CORRUPTION cases, else any named (non-location)
  // entity so cases without an accused (e.g. TAX_EVASION) still name a subject.
  const bannerEntities = getSubjectEntities(caseData?.entities, e => e.type);
  const accusedCount = bannerEntities.length;
  const BANNER_ACCUSED_LIMIT = 5;
  const collapsedAccused = accusedCount > BANNER_ACCUSED_LIMIT;
  const visibleAccusedEntities = collapsedAccused ? bannerEntities.slice(0, BANNER_ACCUSED_LIMIT) : bannerEntities;
  const hiddenAccusedCount = accusedCount - visibleAccusedEntities.length;

  const uniqueNesIds = caseData
    ? [...new Set(caseData.entities.filter(e => e.nes_id).map(e => e.nes_id!))]
    : [];

  const entityQueries = useQueries({
    queries: uniqueNesIds.map((nesId) => ({
      queryKey: ['entity-record', nesId],
      queryFn: () => getEntityById(nesId),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  const courtCaseQueries = useQueries({
    queries: (caseData?.court_cases ?? []).map((courtCaseId) => ({
      queryKey: ['court-case', courtCaseId],
      queryFn: () => getCourtCase(courtCaseId),
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

  const resolvedEntities: Record<string, Entity> = {};
  uniqueNesIds.forEach((nesId, i) => {
    const data = entityQueries[i]?.data;
    if (data) resolvedEntities[nesId] = data;
  });

  const groupedEntities = caseData
    ? getGroupedEntities(caseData.entities)
    : {};

  const hasInvolvedParties = Object.keys(groupedEntities).length > 0;

  // Group evidence by tier
  const groupedEvidence: Record<EvidenceGroup, Array<typeof caseData.evidence[0] & { originalIndex: number }>> = {
    primary: [],
    legal: [],
    secondary: []
  };

  (caseData?.evidence ?? []).forEach((evidence, index) => {
    const group = getEvidenceGroup(evidence.material?.material_type);
    groupedEvidence[group].push({ ...evidence, originalIndex: index });
  });

  // Render order: primary -> legal -> secondary
  const renderOrder: EvidenceGroup[] = ['primary', 'legal', 'secondary'];

  // Legacy /case/<numeric> URLs: replace with the canonical slug. This must
  // happen after all hooks have run so we don't violate rules-of-hooks.
  if (legacyTargetSlug) {
    return <Navigate to={`/case/${legacyTargetSlug}`} replace />;
  }

  // /case/<court-ref> URLs: once the case resolves, replace with its canonical
  // slug. Cases without a slug stay on the court-ref URL.
  if (isCourtRef && caseData?.slug && caseData.slug !== id) {
    return <Navigate to={`/case/${caseData.slug}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
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
  const plainDescription = stripMarkdown(caseData.description).substring(0, 160);
  const metaDescription = plainDescription || caseData.key_allegations?.slice(0, 2).join('. ').substring(0, 160) || "";

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
        <link rel="alternate" type="application/json" href={`${API_BASE_URL}/api/cases/${id}/`} title="Case data (JSON API)" />
        <link rel="alternate" type="application/json+oembed" href={`https://jawafdehi.org/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`} title={`${caseData.title} oEmbed`} />
      </Helmet>
      <CaseDetailBanner
        caseData={caseData}
        resolvedEntities={resolvedEntities}
        actions={<ReportCaseDialog caseId={id || ""} caseTitle={caseData.title} />}
      />

      <main id="main-content" className="flex-1 py-8">
        <div className="container mx-auto max-w-8xl px-4">
          <div>
            <div className="min-w-0">
              <FloatingShareSidebar
                url={canonicalUrl}
                title={caseData.title}
                description={plainDescription}
                isOpen={isShareOpen}
                onToggle={setIsShareOpen}
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
                  {visibleAccusedEntities.map((e, index, arr) => {
                    const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                    let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || t('common.notAvailable');
                    displayName = translateDynamicText(displayName, currentLang);
                    const key = e.nes_id ?? `${e.display_name ?? 'entity'}-${index}`;
                    const to = entityPath(e.nes_id);
                    return (
                      <span key={key}>
                        {to ? (
                          <Link to={to} className="text-primary hover:underline">{displayName}</Link>
                        ) : (
                          <span className="text-foreground">{displayName}</span>
                        )}
                        {index < arr.length - 1 && ', '}
                      </span>
                    );
                  })}
                  {collapsedAccused && (
                    <span className="text-muted-foreground">
                      {t('caseDetail.andMoreAccused', { count: hiddenAccusedCount })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center text-muted-foreground">
                <MapPin className="mr-2 h-5 w-5" />
                <div className="text-sm flex flex-wrap gap-1">
                  {(() => {
                    const locations = caseData.entities.filter(e => e.type === 'location');
                    return locations.length > 0 ? locations.map((e, index) => {
                      const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                      let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || t('common.notAvailable');
                      displayName = translateDynamicText(displayName, currentLang);
                      const key = e.nes_id ?? `${e.display_name ?? 'location'}-${index}`;
                      const to = entityPath(e.nes_id);
                      return (
                        <span key={key}>
                          {to ? (
                            <Link to={to} className="text-primary hover:underline">{displayName}</Link>
                          ) : (
                            <span className="text-foreground">{displayName}</span>
                          )}
                          {index < locations.length - 1 && ', '}
                        </span>
                      );
                    }) : t('common.notAvailable');
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
              {caseData.bigo != null && caseData.bigo > 0 && (
                <div className="flex items-center text-muted-foreground">
                  <Banknote className="mr-2 h-5 w-5" />
                  <span className="text-sm">
                    {t("caseDetail.embezzledAmount")}: {formatBigo(caseData.bigo)}
                  </span>
                </div>
              )}
            </div>
          </div>

                <Separator className="mb-8 hidden print:block" />

                <div className={cn(
                  "grid gap-8 transition-[grid-template-columns] duration-300 ease-out print:block",
                  (caseData.timeline || []).length > 0 && "lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
                )}>
                  <div className="min-w-0 lg:col-start-1 mx-auto max-w-4xl w-full">
                    <Card className="mb-6 sm:mb-8">
                      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
                        <CardTitle id="allegations" className="flex items-center text-xl sm:text-2xl">
                          <AlertTriangle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          {t("caseDetail.allegations")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                        <ul className="space-y-3 sm:space-y-4">
                          {(caseData.key_allegations || []).map((allegation, index) => (
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
                          {(caseData.key_allegations || []).length === 0 && (
                            <li className="text-sm text-muted-foreground italic">
                              {t("common.notAvailable")}
                            </li>
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    {hasInvolvedParties && (
                      <section id="parties-involved">
                        <h2 className="mb-5 text-2xl font-semibold text-foreground">
                          {t("caseDetail.partiesInvolved")}
                        </h2>

                        <div className="space-y-8">
                          {(() => {
                            const unknownLabel = t("caseDetail.relationTypes.unknown");
                            return Object.entries(groupedEntities)
                              .sort(([typeA], [typeB]) => (RELATION_PRIORITY[typeA] ?? 99) - (RELATION_PRIORITY[typeB] ?? 99))
                              .map(([type, entities]) => {
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
                                    initialLimit={8}
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
                    timeline={caseData.timeline || []}
                    title={t("caseDetail.timeline")}
                    className="mb-8 text-foreground print:static print:mb-8 lg:col-start-2 lg:row-start-1 lg:row-span-2"
                  />

                  <div className="min-w-0 lg:col-start-1 mx-auto max-w-4xl w-full">
                    <Card className="mb-8">
                      <CardHeader>
                        <CardTitle id="overview" className="flex items-center">
                          <FileText className="mr-2 h-5 w-5" />
                          {t("caseDetail.overview")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-hidden">
                        <div className="prose-content text-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:space-y-2 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:space-y-2 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:pl-1 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:bg-gradient-to-b [&_th]:from-muted [&_th]:to-muted/80 [&_th]:font-semibold [&_th]:text-sm [&_th]:text-foreground [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-sm [&_td]:text-foreground [&_tr:nth-child(even)]:bg-muted/40 [&_tr:hover]:bg-muted/60 [&_tr]:transition-colors [&_caption]:text-sm [&_caption]:font-semibold [&_caption]:mb-3 [&_caption]:text-foreground">
                          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeColspan]}>{padColspanTableHeaders(caseData.description)}</Markdown>
                        </div>
                      </CardContent>
                    </Card>

                    {(caseData.court_cases ?? []).length > 0 && (
                      <Card className="mb-8">
                        <CardHeader>
                          <CardTitle id="court-case" className="flex items-center">
                            <Scale className="mr-2 h-5 w-5" />
                            {t("caseDetail.courtCase", "Court Case")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {(caseData.court_cases ?? []).map((courtCaseId, index) => {
                              const query = courtCaseQueries[index];
                              return (
                                <CourtCaseCard
                                  key={courtCaseId}
                                  courtCaseId={courtCaseId}
                                  courtCase={query?.data as CourtCase | undefined}
                                  isLoading={query?.isLoading ?? false}
                                  linkToDetail
                                />
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {caseData.evidence.length > 0 && (
                      <Card className="mb-8">
                        <CardHeader>
                          <CardTitle id="evidence" className="flex items-center">
                            <FileText className="mr-2 h-5 w-5" />
                            {t("caseDetail.evidence")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div>
                            {caseData.evidence.map((evidence, index) => (
                              <DocumentSourceCard
                                key={`${evidence.material_iri}-${index}`}
                                material={evidence.material ?? null}
                                materialIri={evidence.material_iri}
                                itemNumber={index + 1}
                                evidenceDescription={evidence.additional_details}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {caseData.missing_details && (
                      <section id="missing-details" className="mb-8 border-t border-border pt-5">
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
                      <section id="notes" className="mb-8 border-t border-border pt-5">
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
                    href={`${API_BASE_URL}/admin/cases/case/${id}/change/`}
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

          </div>
        </div>
      </main>

      {/* Mobile Share Button */}
      {isMobile && (
        <div className="pointer-events-auto fixed bottom-5 left-4 sm:left-6 z-40 no-print">
          <ShareButton
            url={canonicalUrl}
            title={caseData.title}
            description={plainDescription}
            variant="outline"
            size="lg"
            showLabel={true}
            className="shadow-lg border-2 hover:shadow-xl"
          />
        </div>
      )}

      {/* Share Sidebar Toggle Button (Desktop) */}
      {!isMobile && (
        <div className="pointer-events-auto fixed left-4 top-1/2 -translate-y-1/2 z-39 hidden lg:flex no-print">
          {!isShareOpen && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-lg shadow-lg border-2 hover:shadow-xl transition-all"
                  onClick={() => setIsShareOpen(true)}
                  aria-label={t("share.share")}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{t("share.share")}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

    </div>
  );
};

export default CaseDetail;
