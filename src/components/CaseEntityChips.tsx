import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Building2, MapPin, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";
import { getPrimaryName } from "@/utils/entity-helpers";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { cn } from "@/lib/utils";
import { entityPath } from "@/lib/entity-links";

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
  const remainingCount = entities.length - initialLimit;

  let toggleLabel = "";
  if (isExpanded) {
    toggleLabel = language === "ne" ? "थोरै हेर्नुहोस्" : "View less";
  } else {
    toggleLabel = language === "ne" ? `थप ${remainingCount} हेर्नुहोस्` : `View ${remainingCount} more`;
  }

  if (entities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center sm:justify-start">
        {displayedEntities.map((jawafEntity, index) => {
          const entity = jawafEntity.nes_id ? resolvedEntities[jawafEntity.nes_id] ?? null : null;
          const displayName = getDisplayName(jawafEntity, entity, language);
          const imageUrl = getEntityImage(entity);

          const rawNotes = jawafEntity.notes
            ? jawafEntity.notes.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
            : "";
          const strippedNotes = rawNotes ? translateDynamicText(rawNotes, language) : "";
          // Case entities are keyed on their NES @id IRI (the backend no longer
          // returns a numeric id). Fall back to display_name/index for id-less binds.
          const key = jawafEntity.nes_id ?? `${jawafEntity.display_name ?? 'entity'}-${index}`;
          const to = entityPath(jawafEntity.nes_id) ?? undefined;

          const inner = (
            <>
              <Avatar className="h-16 w-16 border border-border/80 shadow-sm transition-transform group-hover:scale-105">
                {imageUrl ? (
                  <AvatarImage src={imageUrl} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getFallbackIcon(jawafEntity, entity)}
                </AvatarFallback>
              </Avatar>
              <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
                {displayName}
              </span>
              {strippedNotes && (
                <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {strippedNotes}
                </span>
              )}
            </>
          );

          if (!to) {
            return (
              <div
                key={key}
                className="group flex w-[11rem] flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center"
              >
                {inner}
              </div>
            );
          }

          return (
            <Link
              key={key}
              to={to}
              className="group flex w-[11rem] flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center transition-all duration-200 hover:bg-muted/40"
            >
              {inner}
            </Link>
          );
        })}
      </div>
      
      {hasMore && (
        <div className="flex justify-center sm:justify-start px-3">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-primary hover:underline transition-all"
          >
            {toggleLabel}
          </button>
        </div>
      )}
    </div>
  );
}
