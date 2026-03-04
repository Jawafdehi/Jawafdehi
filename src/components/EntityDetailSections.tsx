/**
 * Entity Detail Sections
 * 
 * Display entity detail sections using raw NES Entity data
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  CreditCard, 
  FileText,
  Tag,
  Vote,
  ExternalLink,
} from 'lucide-react';
import type { Entity, Candidacy } from '@/types/nes';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { 
  translateElectionYearType as translateElectionYearTypeUtil,
  translatePosition as translatePositionUtil,
  translateSymbolName as translateSymbolNameUtil
} from '@/lib/translate-dynamic-content';
import { getTagDescription } from '@/config/tag-descriptions';

interface EntityDetailSectionsProps {
  entity: Entity;
}

// Helper function to translate attribute keys
function translateAttributeKey(key: string, t: TFunction): string {
  const keyMap: Record<string, string> = {
    'election_council_misc': t('entityDetail.electionCouncilMisc'),
    'institution': t('entityDetail.institution'),
    'other_details': t('entityDetail.otherDetails'),
    'qualification': t('entityDetail.qualification'),
  };
  
  return keyMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper function to translate election year and type
function translateElectionYearType(year: number, type: string, t: TFunction, i18n: { language: string }): string {
  return translateElectionYearTypeUtil(String(year), type, t, i18n.language);
}

// Helper function to translate symbol names
function translateSymbolName(symbolName: unknown, t: TFunction, i18n: { language: string }): string {
  return translateSymbolNameUtil(symbolName, t, i18n.language);
}

// Helper function to translate attribution titles
function translateAttributionTitle(title: unknown, t: TFunction, i18n: { language: string }): string {
  if (!title) return t('entityDetail.source');
  
  // Extract values from LangText structure
  const titleObj = title as { en?: { value?: string }; ne?: { value?: string } };
  const enValue = titleObj.en?.value;
  const neValue = titleObj.ne?.value;
  
  // Get current language
  const currentLang = i18n.language;
  
  // Return the value in the current language, fallback to other language
  if (currentLang === 'ne') {
    return neValue || enValue || t('entityDetail.source');
  } else {
    return enValue || neValue || t('entityDetail.source');
  }
}

// Helper function to format and translate position text
function translatePosition(position: string, t: TFunction, i18n: { language: string }): string {
  return translatePositionUtil(position, t, i18n.language);
}

// Helper function to get description in current language
function getDescription(description: unknown, i18n: { language: string }): string {
  if (!description) return '';
  
  const descObj = description as { en?: { value?: string }; ne?: { value?: string } };
  const currentLang = i18n.language;
  
  if (currentLang === 'ne') {
    return descObj.ne?.value || descObj.en?.value || '';
  } else {
    return descObj.en?.value || descObj.ne?.value || '';
  }
}
function formatAttributeValue(value: unknown): string | Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Handle primitive types
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    
    // Check if it's a LangText structure (has en/ne with value)
    if (obj.en?.value || obj.ne?.value) {
      const enValue = obj.en?.value;
      const neValue = obj.ne?.value;
      
      // Show both if they exist and are different
      if (enValue && neValue && enValue !== neValue) {
        return `${enValue} (${neValue})`;
      }
      // Otherwise show whichever exists
      return enValue || neValue || null;
    }
    
    // Check if it has a direct value property
    if (obj.value !== undefined && typeof obj.value === 'string') {
      return obj.value;
    }
    
    // For arrays, join them
    if (Array.isArray(value)) {
      const formatted = value.map(v => formatAttributeValue(v)).filter(v => v !== null);
      return formatted.length > 0 ? formatted.join(', ') : null;
    }
    
    // For nested objects (like election_council_misc), return as structured data
    // This will be handled specially in the rendering
    return obj;
  }
  
  return null;
}

// Helper to render nested object fields
function renderNestedFields(obj: Record<string, unknown>, t: TFunction): React.ReactNode {
  const fields: React.ReactNode[] = [];
  
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && val !== undefined) {
      const formatted = formatAttributeValue(val);
      if (formatted && typeof formatted !== 'object') {
        const translatedKey = translateAttributeKey(key, t);
        fields.push(
          <div key={key} className="text-sm">
            <span className="font-medium text-muted-foreground">{translatedKey}:</span> {formatted}
          </div>
        );
      }
    }
  }
  
  return fields.length > 0 ? <div className="space-y-1">{fields}</div> : null;
}

export function EntityDetailSections({ entity }: EntityDetailSectionsProps) {
  const { t, i18n } = useTranslation();
  // Check if entity is a Person type (has electoral_details)
  const isPerson = entity.type === 'person';
  const personEntity = isPerson ? (entity as { electoral_details?: { candidacies?: Candidacy[] } }) : null;

  return (
    <div className="space-y-6">
      {/* Tags Section */}
      {entity.tags && entity.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t('entityDetail.tags')}
              <Badge variant="outline" className="ml-auto">
                {entity.tags.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entity.tags.map((tag, index) => {
                const currentLang = i18n.language as 'en' | 'ne';
                const description = getTagDescription(tag, currentLang);
                
                return (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Tag className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm leading-relaxed">
                          {description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-[10px]">
                            {tag}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Details (Names + Attributes) */}
      {((entity.names && entity.names.length > 0) || (entity.attributes && Object.keys(entity.attributes).length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('entityDetail.personalDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Names Section */}
            {entity.names && entity.names.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">{t('entityDetail.name')}</h4>
                <dl className="space-y-4">
                  {entity.names.map((name, index) => (
                    <div key={index} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <dt className="text-sm font-medium text-muted-foreground mb-2">
                        {name.kind === 'PRIMARY' ? t('entityDetail.primaryName') : 
                         name.kind === 'ALIAS' ? t('entityDetail.alias') :
                         name.kind === 'ALTERNATE' ? t('entityDetail.alternateName') :
                         name.kind === 'BIRTH_NAME' ? t('entityDetail.birthName') : name.kind}
                      </dt>
                      <dd className="space-y-1">
                        {name.en?.full && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">{t('entityDetail.english')}:</span> {name.en.full}
                          </div>
                        )}
                        {name.ne?.full && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">{t('entityDetail.nepali')}:</span> {name.ne.full}
                          </div>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Attributes Section */}
            {entity.attributes && Object.keys(entity.attributes).length > 0 && (
              <>
                {entity.names && entity.names.length > 0 && (
                  <div className="border-t border-border pt-4" />
                )}
                <div>
                  <h4 className="text-sm font-semibold mb-3">{t('entityDetail.additionalDetails')}</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(entity.attributes)
                      .map(([key, value]) => {
                        const formatted = formatAttributeValue(value);
                        return { key, value, formatted };
                      })
                      .filter(({ formatted }) => formatted !== null)
                      .map(({ key, formatted }) => (
                        <div key={key}>
                          <dt className="text-sm font-medium text-muted-foreground capitalize mb-1">
                            {translateAttributeKey(key, t)}
                          </dt>
                          <dd className="text-sm">
                            {typeof formatted === 'object' && !Array.isArray(formatted) && formatted !== null
                              ? renderNestedFields(formatted as Record<string, unknown>, t)
                              : String(formatted)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Identifiers */}
      {((entity.identifiers && entity.identifiers.length > 0) || entity.id) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('entityDetail.identifiers')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tundikhel ID as a prominent button */}
            {entity.id && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-2">{t('entityDetail.tundikhel')}</dt>
                <dd>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="font-mono"
                  >
                    <a 
                      href={`https://tundikhel.newnepal.org/#/entity/${entity.id.replace(/^entity:/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('entityDetail.viewInTundikhel')}
                    </a>
                  </Button>
                </dd>
              </div>
            )}
            
            {/* Other identifiers (filter out "other" scheme) */}
            {entity.identifiers && entity.identifiers.filter(id => id.scheme !== 'other').length > 0 && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-2">{t('entityDetail.externalIdentifiers')}</dt>
                <dd className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {entity.identifiers
                    .filter(identifier => identifier.scheme !== 'other')
                    .map((identifier, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Badge variant="outline" className="capitalize">
                          {identifier.scheme}
                        </Badge>
                        <span className="text-sm font-mono break-all">{identifier.value}</span>
                      </div>
                    ))}
                </dd>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* {entity.contacts && entity.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                    <dd className="text-sm">
                      <a href={`mailto:${email}`} className="text-primary hover:underline">
                        {email}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                    <dd className="text-sm">
                      <a href={`tel:${phone}`} className="text-primary hover:underline">
                        {phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {website && (
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Website</dt>
                    <dd className="text-sm">
                      <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {website}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )} */}

      {/* Electoral History */}
      {isPerson && personEntity?.electoral_details?.candidacies && personEntity.electoral_details.candidacies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" />
              {t('entityDetail.electoralHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {personEntity.electoral_details.candidacies.map((candidacy: Candidacy, index: number) => (
                <div key={index} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    {candidacy.elected !== undefined && (
                      <Badge variant={candidacy.elected ? "default" : "secondary"} className="flex-shrink-0 mt-0.5 w-24 justify-center">
                        {candidacy.elected ? t('entityDetail.elected') : t('entityDetail.notElected')}
                      </Badge>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-base">
                        {translateElectionYearType(candidacy.election_year, candidacy.election_type, t, i18n)} {t('entityDetail.election')}
                      </h4>
                      {candidacy.position && (
                        <p className="text-sm text-muted-foreground capitalize mt-1">
                          {translatePosition(candidacy.position, t, i18n)}
                        </p>
                      )}
                      {candidacy.symbol?.symbol_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('entityDetail.symbol')}: {translateSymbolName(candidacy.symbol.symbol_name, t, i18n)}
                        </p>
                      )}
                      
                      {candidacy.votes_received !== undefined && candidacy.votes_received !== null && (
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">{t('entityDetail.votes')}:</span>{' '}
                          <span className="font-medium">{candidacy.votes_received.toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {entity.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('entityDetail.about')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getDescription(entity.description, i18n)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entity Detail Source */}
      {entity.attributions && entity.attributions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('entityDetail.entityDetailSource')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {entity.attributions.map((attribution, index) => {
                const title = translateAttributionTitle(attribution.title, t, i18n);
                return (
                  <li key={index} className="border-l-2 border-primary pl-4 text-sm">
                    {title}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
