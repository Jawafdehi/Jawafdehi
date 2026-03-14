import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DocumentSourceCard } from "@/components/DocumentSourceCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, User, FileText, AlertTriangle, ArrowLeft, ExternalLink, AlertCircle, Info, Mail, MessageCircle } from "lucide-react";
import { getCaseById, getDocumentSourceById } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import type { CaseDetail as CaseDetailType, DocumentSource } from "@/types/jds";
import type { Entity } from "@/types/nes";
import { toast } from "sonner";
import { formatDateWithBS, formatCaseDateRange } from "@/utils/date";
import { ReportCaseDialog } from "@/components/ReportCaseDialog";
import { JAWAFDEHI_WHATSAPP_NUMBER, JAWAFDEHI_EMAIL } from "@/config/constants";
import { translateDynamicText } from "@/lib/translate-dynamic-content";

const CaseDetail = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { id } = useParams();
  const [caseData, setCaseData] = useState<CaseDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSources, setResolvedSources] = useState<Record<number, DocumentSource>>({});
  const [resolvedEntities, setResolvedEntities] = useState<Record<string, Entity>>({});

  useEffect(() => {
    const fetchCase = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getCaseById(parseInt(id));
        setCaseData(data);

        // Resolve evidence sources
        const sourcePromises = data.evidence.map(async (evidence) => {
          try {
            const source = await getDocumentSourceById(evidence.source_id);
            return { id: evidence.source_id, source };
          } catch {
            return null;
          }
        });

        const sources = await Promise.all(sourcePromises);
        const sourcesMap = sources.reduce((acc, item) => {
          if (item) acc[item.id] = item.source;
          return acc;
        }, {} as Record<number, DocumentSource>);
        setResolvedSources(sourcesMap);

        // Resolve entities from NES if they have nes_id
        const allEntities = [...data.alleged_entities, ...data.related_entities, ...data.locations];
        const entitiesWithNesId = allEntities.filter(e => e.nes_id);
        const uniqueNesIds = [...new Set(entitiesWithNesId.map(e => e.nes_id!))];

        const entityPromises = uniqueNesIds.map(async (nesId) => {
          try {
            const entity = await getEntityById(nesId);
            return { id: nesId, entity };
          } catch {
            return null;
          }
        });

        const entities = await Promise.all(entityPromises);
        const entitiesMap = entities.reduce((acc, item) => {
          if (item) acc[item.id] = item.entity;
          return acc;
        }, {} as Record<string, Entity>);
        setResolvedEntities(entitiesMap);

      } catch (err) {
        console.error("Failed to fetch case:", err);
        setError(t("caseDetail.failedToLoad"));
        toast.error(t("caseDetail.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, t]);

  if (loading) {
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
        <Footer />
      </div>
    );
  }

  if (error || !caseData) {
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
                {error || t("caseDetail.notFound")}
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{caseData.title} | Jawafdehi</title>
        <meta name="description" content={caseData.description.replace(/<[^>]*>/g, '').substring(0, 160)} />
        <meta property="og:title" content={caseData.title} />
        <meta property="og:description" content={caseData.description.replace(/<[^>]*>/g, '').substring(0, 160)} />
        <meta property="og:type" content="article" />
      </Helmet>
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex justify-between mb-4">
            <Button variant="outline" asChild className="mb-2">
              <Link to="/cases">
                <ArrowLeft className="h-4 w-4" />
                <span className="mt-[5px]">
                  {t("caseDetail.backToCases")}
                </span>
              </Link>
            </Button>

            <ReportCaseDialog
              caseId={id || ""}
              caseTitle={caseData.title}
            />
          </div>

          {/* Disclaimer Banner */}
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              {t("footer.disclaimer")}
            </AlertDescription>
          </Alert>

          {/* Case Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge className="bg-alert text-alert-foreground">
                {t("caseDetail.status.ongoing")}
              </Badge>
              <Badge variant="outline" className={caseData.case_type === 'CORRUPTION' ? 'bg-destructive/20 text-destructive' : 'bg-orange-500/20 text-orange-700'}>
                {caseData.case_type === 'CORRUPTION' ? t("cases.type.corruption") : t("cases.type.brokenPromise")}
              </Badge>
              {caseData.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
            {/* NOTE: Dynamic case content from Entity API remains in English until API-side i18n is implemented */}
            <h1 className="text-4xl font-bold text-foreground mb-6">{caseData.title}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center text-muted-foreground">
                <User className="mr-2 h-5 w-5 flex-shrink-0" />
                <div className="text-sm flex flex-wrap gap-1">
                  {caseData.alleged_entities.map((e, index) => {
                    const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                    let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || 'Unknown';
                    displayName = translateDynamicText(displayName, currentLang);
                    return (
                      <span key={e.id}>
                        <Link to={`/entity/${e.id}`} className="text-primary hover:underline">
                          {displayName}
                        </Link>
                        {index < caseData.alleged_entities.length - 1 && ', '}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center text-muted-foreground">
                <MapPin className="mr-2 h-5 w-5" />
                <div className="text-sm flex flex-wrap gap-1">
                  {caseData.locations.length > 0 ? caseData.locations.map((e, index) => {
                    const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                    let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || 'Unknown';
                    displayName = translateDynamicText(displayName, currentLang);
                    return (
                      <span key={e.id}>
                        <Link to={`/entity/${e.id}`} className="text-primary hover:underline">
                          {displayName}
                        </Link>
                        {index < caseData.locations.length - 1 && ', '}
                      </span>
                    );
                  }) : 'N/A'}
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

          {/* Key Allegations */}
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

          {/* Related Entities */}
          {caseData.related_entities.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{t("caseDetail.partiesInvolved")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {caseData.related_entities.map((e, index) => {
                    const entity = e.nes_id ? resolvedEntities[e.nes_id] : null;
                    let displayName = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id || 'Unknown';
                    displayName = translateDynamicText(displayName, currentLang);
                    return (
                      <span key={index}>
                        <Link to={`/entity/${e.id}`} className="text-primary hover:underline">
                          {displayName}
                        </Link>
                        {index < caseData.related_entities.length - 1 && ', '}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
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
                      <div className="flex-1 pb-6">
                        <p className="text-sm font-semibold text-foreground mb-1">
                          {formatDateWithBS(item.date)}
                        </p>
                        <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                {t("caseDetail.overview")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_a]:underline [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:space-y-2 [&_ul]:my-4 [&_li]:ml-6 [&_li]:pl-2 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:bg-muted [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-muted/50"
                dangerouslySetInnerHTML={{ __html: caseData.description }}
              />
            </CardContent>
          </Card>

          {/* Evidence */}
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

          {/* Contact and Edit Section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
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
                <span className="mt-1.5">
                  {t("caseDetail.editCase")}
                </span>
              </a>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CaseDetail;
