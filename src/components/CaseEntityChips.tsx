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

export function CaseEntityChips({ entities, resolvedEntities, language }: CaseEntityChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldCenter, setShouldCenter] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateAlignment = () => {
      const firstItemTop = container.children[0]?.getBoundingClientRect().top;
      const wraps = Array.from(container.children).some(
        (child) => child.getBoundingClientRect().top > firstItemTop
      );
      setShouldCenter(wraps);
    };

    updateAlignment();
    const resizeObserver = new ResizeObserver(updateAlignment);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [entities.length]);

  if (entities.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-wrap gap-4", shouldCenter ? "justify-center" : "justify-start")}
    >
      {entities.map((jawafEntity) => {
        const entity = jawafEntity.nes_id ? resolvedEntities[jawafEntity.nes_id] ?? null : null;
        const displayName = getDisplayName(jawafEntity, entity, language);
        const imageUrl = getEntityImage(entity);

        return (
          <Link
            key={jawafEntity.id}
            to={`/entity/${jawafEntity.id}`}
            className="group flex w-[8.5rem] flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/40"
          >
            <Avatar className="h-16 w-16 border border-border/80 shadow-sm">
              {imageUrl ? (
                <AvatarImage src={imageUrl} alt={displayName} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-muted text-muted-foreground">
                {getFallbackIcon(jawafEntity, entity)}
              </AvatarFallback>
            </Avatar>
            <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
              {displayName}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
