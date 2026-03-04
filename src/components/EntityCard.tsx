import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, User, MapPin } from "lucide-react";
import { Entity } from "@/services/api";
import { getPrimaryName, getAttribute } from "@/utils/nes-helpers";
import type { JawafEntity } from "@/types/jds";
import { translateDynamicText } from "@/lib/translate-dynamic-content";

interface EntityCardProps {
  entity?: Entity; // NES entity data (optional)
  jawafEntity: JawafEntity; // JDS entity data (required)
}

const EntityCard = ({ entity, jawafEntity }: EntityCardProps) => {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language || 'ne') as 'en' | 'ne';

  // Use display_name from JawafEntity if available, otherwise use NES entity name
  let primaryName = jawafEntity.display_name || t('entityCard.unknown');
  let alternateName: string | null = null;
  let position: string | null = null;
  let organization: string | null = null;
  let province: string | null = null;
  let isOrganization = false;
  let profilePicUrl: string | null = null;

  // If NES entity data is available, use it for rich display
  if (entity) {
    primaryName = getPrimaryName(entity.names, currentLang) || getPrimaryName(entity.names, 'en') || primaryName;
    alternateName = currentLang === 'ne'
      ? getPrimaryName(entity.names, 'en')
      : getPrimaryName(entity.names, 'ne');
    
    const positionValue = getAttribute(entity, 'position') || getAttribute(entity, 'role');
    position = positionValue ? translateDynamicText(String(positionValue), currentLang) : null;
    
    const organizationValue = getAttribute(entity, 'organization');
    organization = organizationValue ? translateDynamicText(String(organizationValue), currentLang) : null;
    
    province = (getAttribute(entity, 'province') || getAttribute(entity, 'location')) as string | null;
    if (province) {
      province = translateDynamicText(province, currentLang);
    }
    isOrganization = entity.type === 'organization';

    // Get profile picture (prefer thumb, fallback to first available)
    if (entity.pictures && entity.pictures.length > 0) {
      const thumbPicture = entity.pictures.find(p => p.type === 'thumb');
      profilePicUrl = thumbPicture?.url || entity.pictures[0]?.url || null;
    }
  } else if (jawafEntity.nes_id) {
    // Show nes_id as fallback if NES data failed to load
    primaryName = jawafEntity.nes_id;
  }

  return (
    <Link to={`/entity/${jawafEntity.id}`}>
      <Card className="hover:shadow-lg transition-shadow duration-200 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 flex-shrink-0">
              {profilePicUrl ? (
                <AvatarImage src={profilePicUrl} alt={primaryName} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-muted">
                {isOrganization ? (
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight mb-1">
                {primaryName}
              </h3>
              {alternateName && alternateName !== primaryName && (
                <p className="text-sm text-muted-foreground">{alternateName}</p>
              )}
              {position && (
                <p className="text-sm text-muted-foreground mt-1">{position}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <div className="space-y-2">
            {organization && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{organization}</span>
              </div>
            )}

            {province && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{province}</span>
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {jawafEntity.alleged_cases && jawafEntity.alleged_cases.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {jawafEntity.alleged_cases.length} {t('entityCard.alleged')}
                </Badge>
              )}
              {jawafEntity.related_cases && jawafEntity.related_cases.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {jawafEntity.related_cases.length} {t('entityCard.related')}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default EntityCard;
