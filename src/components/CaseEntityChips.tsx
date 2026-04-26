import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Building2, MapPin, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/nes";
import { getPrimaryName } from "@/utils/nes-helpers";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { cn } from "@/lib/utils";

interface CaseEntityChipsProps {
  entities: JawafEntity[];
  resolvedEntities: Record<string, Entity>;
  language: string;
  initialLimit?: number;
}

function getEntityImage(entity: Entity | null) {
  if (!entity?.pictures?.length) {
    return null;
  }

  return (
    entity.pictures.find((picture) => picture.type === "thumb")?.url ||
    entity.pictures.find((picture) => picture.type === "full")?.url ||
    entity.pictures[0]?.url ||
    null
  );
}

function getDisplayName(jawafEntity: JawafEntity, entity: Entity | null, language: string) {
  const lang = language === "ne" ? "ne" : "en";
  const fallbackLang = lang === "ne" ? "en" : "ne";
  const name =
    (entity ? getPrimaryName(entity.names, lang) || getPrimaryName(entity.names, fallbackLang) : "") ||
    jawafEntity.display_name ||
    jawafEntity.nes_id ||
    "Unknown";

  return translateDynamicText(name, language);
}

function getFallbackIcon(jawafEntity: JawafEntity, entity: Entity | null) {
  if (entity?.type === "location" || jawafEntity.type === "location") {
    return <MapPin className="h-5 w-5" />;
  }

  if (entity?.type === "organization" || jawafEntity.type === "organization") {
    return <Building2 className="h-5 w-5" />;
  }

  return <User className="h-5 w-5" />;
}

export function CaseEntityChips({ 
  entities, 
  resolvedEntities, 
  language, 
  initialLimit = 12 
}: CaseEntityChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayedEntities = isExpanded ? entities : entities.slice(0, initialLimit);
  const hasMore = entities.length > initialLimit;


  if (entities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-start">
        {displayedEntities.map((jawafEntity) => {
          const entity = jawafEntity.nes_id ? resolvedEntities[jawafEntity.nes_id] ?? null : null;
          const displayName = getDisplayName(jawafEntity, entity, language);
          const imageUrl = getEntityImage(entity);

          return (
            <Link
              key={jawafEntity.id}
              to={`/entity/${jawafEntity.id}`}
              className="group flex w-[8.5rem] flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center transition-all duration-200 hover:bg-muted/40"
            >
              <Avatar className="h-16 w-16 border border-border/80 shadow-sm transition-transform group-hover:scale-105">
                {imageUrl ? (
                  <AvatarImage src={imageUrl} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getFallbackIcon(jawafEntity, entity)}
                </AvatarFallback>
              </Avatar>
              <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground group-hover:text-primary transition-colors">
                {displayName}
              </span>
            </Link>
          );
        })}
      </div>
      
      {hasMore && (
        <div className="flex justify-start px-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-primary hover:underline transition-all"
          >
            {isExpanded ? (language === "ne" ? "थोरै हेर्नुहोस्" : "View less") : (language === "ne" ? `थप ${entities.length - initialLimit} हेर्नुहोस्` : `View ${entities.length - initialLimit} more`)}
          </button>
        </div>
      )}
    </div>
  );
}
