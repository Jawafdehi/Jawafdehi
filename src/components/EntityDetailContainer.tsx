/**
 * EntityDetailContainer
 * 
 * Data container for entity detail - handles fetching and passes to existing UI
 * Does NOT change visual styles - only wires data
 */

import { useTranslation } from 'react-i18next';
import { useEntityDetail } from '@/hooks/useEntityDetail';
import { EntityDetailSections } from '@/components/EntityDetailSections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, FileText, Building2, User, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getPrimaryName, getAttribute, getEmail, getPhone, getWebsite, getDescription, formatSubType } from '@/utils/nes-helpers';
import type { Case as JDSCase } from '@/types/jds';
import { formatDate } from '@/utils/date';

interface EntityDetailContainerProps {
  entityId?: string;
  entityType?: string;
  entitySlug?: string;
  jawafEntityId?: number;
  jawafEntityName?: string | null;
  hasNesData?: boolean;
  allegedCaseIds?: number[];
  relatedCaseIds?: number[];
}

export function EntityDetailContainer({
  entityId,
  entityType,
  entitySlug,
  jawafEntityId,
  jawafEntityName,
  hasNesData = true,
  allegedCaseIds = [],
  relatedCaseIds = [],
}: EntityDetailContainerProps) {
  const { t } = useTranslation();
  const {
    entity,
    allegations,
    allegedCases,
    relatedCases,
    loading,
    error,
  } = useEntityDetail({
    entityId,
    entityType,
    entitySlug,
    allegedCaseIds,
    relatedCaseIds,
  });

  // Combine alleged and related cases
  const allCases = [...allegedCases, ...relatedCases];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load entity details: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!entity && hasNesData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">{t("entityDetail.entityNotFound")}</p>
          <Button asChild className="mt-4">
            <Link to="/entities">{t("entityDetail.backToEntities")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statistics = {
    cases: allCases.length,
  };

  // Extract entity data for display
  const primaryName = entity ? (getPrimaryName(entity.names, 'en') || 'Unknown') : (jawafEntityName || 'Unknown Entity');
  const primaryNameNe = entity ? getPrimaryName(entity.names, 'ne') : null;
  const position = entity ? (getAttribute(entity, 'position') || getAttribute(entity, 'role')) : null;
  const organization = entity ? getAttribute(entity, 'organization') : null;
  const isOrganization = entity ? entity.type === 'organization' : false;
  const email = entity ? getEmail(entity.contacts) : null;
  const phone = entity ? getPhone(entity.contacts) : null;
  const website = entity ? getWebsite(entity.contacts) : null;
  const description = entity ? getDescription(entity.description, 'en') : null;
  const photoUrl = entity?.pictures?.find(p => p.type === 'thumb' || p.type === 'full')?.url;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Entity Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Photo/Avatar */}
            <Avatar className="w-32 h-32 rounded-lg flex-shrink-0">
              <AvatarImage src={photoUrl} alt={primaryName} className="object-cover" />
              <AvatarFallback className="rounded-lg bg-muted">
                {isOrganization ? (
                  <Building2 className="w-16 h-16 text-muted-foreground" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-3xl font-bold mb-2">
                  {primaryName}{' '}
                  {jawafEntityId && (
                    <span className="text-muted-foreground font-mono text-xl">#{jawafEntityId}</span>
                  )}
                </h1>
                {primaryNameNe && (
                  <p className="text-xl text-muted-foreground mb-2">{primaryNameNe}</p>
                )}
                {position && (
                  <p className="text-lg text-muted-foreground">{String(position)}</p>
                )}
                {organization && (
                  <p className="text-muted-foreground">{String(organization)}</p>
                )}
                
                {entity && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Badge variant="outline">{t(`entityDetail.${entity.type}`)}</Badge>
                    {entity.sub_type && <Badge variant="outline">{formatSubType(entity.sub_type)}</Badge>}
                  </div>
                )}
              </div>

              {/* Contact Information */}
              {entity && entity.contacts && entity.contacts.length > 0 && (
                <div className="space-y-2 text-sm">
                  {email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${email}`} className="text-primary hover:underline">
                        {email}
                      </a>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{phone}</span>
                    </div>
                  )}
                  {website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <a 
                        href={website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {website}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex md:flex-col gap-4 md:min-w-[200px]">
              <Card className="flex-1 bg-muted/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{allegedCases.length}</div>
                  <div className="text-sm text-muted-foreground">{t('entityDetail.totalAllegations')}</div>
                </CardContent>
              </Card>
              <Card className="flex-1 bg-muted/50">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{allCases.length}</div>
                  <div className="text-sm text-muted-foreground">{t('entityDetail.activeCases')}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-2">{t('entityDetail.about')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cases">{t('entityDetail.cases')}</TabsTrigger>
          <TabsTrigger value="overview">{t('entityDetail.entityDetails')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* No NES Data Alert */}
          {!hasNesData && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('entityDetail.noNesDataAlert')}
              </AlertDescription>
            </Alert>
          )}

          {/* All Detail Sections */}
          {entity && <EntityDetailSections entity={entity} />}

        </TabsContent>

        <TabsContent value="cases">
          {/* Alleged Cases */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("entityDetail.allegedCases")} ({allegedCases.length})</CardTitle>
              <p className="text-sm text-muted-foreground">{t('entityDetail.allegedCasesDescription')}</p>
            </CardHeader>
            <CardContent>
              {allegedCases.length > 0 ? (
                <div className="space-y-4">
                  {allegedCases.map((caseItem: JDSCase) => (
                    <div key={caseItem.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <Link to={`/case/${caseItem.id}`} className="font-medium hover:text-primary hover:underline">
                          {caseItem.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(caseItem.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {caseItem.key_allegations?.join('. ') || caseItem.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{caseItem.case_type}</Badge>
                        {caseItem.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">{t("entityDetail.noAllegedCases")}</p>
              )}
            </CardContent>
          </Card>

          {/* Related Cases */}
          <Card>
            <CardHeader>
              <CardTitle>{t("entityDetail.relatedCases")} ({relatedCases.length})</CardTitle>
              <p className="text-sm text-muted-foreground">{t('entityDetail.relatedCasesDescription')}</p>
            </CardHeader>
            <CardContent>
              {relatedCases.length > 0 ? (
                <div className="space-y-4">
                  {relatedCases.map((caseItem: JDSCase) => (
                    <div key={caseItem.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <Link to={`/case/${caseItem.id}`} className="font-medium hover:text-primary hover:underline">
                          {caseItem.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(caseItem.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {caseItem.key_allegations?.join('. ') || caseItem.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{caseItem.case_type}</Badge>
                        {caseItem.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">{t("entityDetail.noRelatedCases")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
