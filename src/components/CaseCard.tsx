import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { TFunction } from "i18next";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, User } from "lucide-react";
import { entityPath } from "@/lib/entity-links";

const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

interface CaseCardProps {
  id: string;
  slug?: string | null; // URL-friendly slug for navigation
  title: string;
  entity: string;
  entityNames?: string[];
  location: string;
  status: "ongoing" | "resolved" | "under-investigation";
  tags?: string[];
  description: string;
  allegations?: string[]; // Key allegations array
  entityIds?: string[]; // NES entity @id IRIs (used to link to /entity/*)
  locationIds?: string[]; // NES entity @id IRIs (used to link to /entity/*)
  thumbnailUrl?: string; //Thumbnail image
  viewMode?: "grid" | "list";
  hideDescription?: boolean;
}

function formatEntityCount(count: number, language: string) {
  if (!language.startsWith("ne")) {
    return count.toString();
  }

  return count.toString().replace(/\d/g, (digit) => nepaliDigits[Number(digit)]);
}

function getEntitySummary(entity: string, entityNames: string[] | undefined, language: string, t: TFunction) {
  const names = entityNames?.filter(Boolean) ?? entity.split(",").map((name) => name.trim()).filter(Boolean);
  const firstName = names[0] || entity;
  const remainingCount = Math.max(names.length - 1, 0);
  const countLabel = formatEntityCount(remainingCount, language);

  if (remainingCount === 0) {
    return firstName;
  }

  if (language.startsWith("ne")) {
    return t("caseCard.entitySummary.withOthersNepali", { name: firstName, count: remainingCount, countLabel });
  }

  return t("caseCard.entitySummary.withOthers", { count: remainingCount, name: firstName });
}

export const CaseCard = ({ id, slug, title, entity, entityNames, location, status, tags = [], description, allegations, entityIds, locationIds, thumbnailUrl, viewMode = "grid", hideDescription }: CaseCardProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const entitySummary = getEntitySummary(entity, entityNames, i18n.language, t);

  // Slug-only navigation: never fall back to numeric id. The slug-only API
  // would 404 on /case/<numeric>, and the worker.ts edge redirect only fires
  // in production. Cards without a slug render as non-clickable — the missing
  // slug is a data signal that the row needs a backend backfill.
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const caseSlug = normalizedSlug && normalizedSlug.toLowerCase() !== "null" ? normalizedSlug : null;

  // Check if we have a valid thumbnail URL
  const hasValidThumbnail = thumbnailUrl && thumbnailUrl.trim() !== '';
  const [imageSrc, setImageSrc] = useState(hasValidThumbnail ? thumbnailUrl : null);

  // Handle image load errors by hiding the image
  const handleImageError = () => {
    setImageSrc(null);
  };

  const statusConfig = {
    ongoing: { label: t("caseCard.status.ongoing"), color: "bg-alert text-alert-foreground" },
    resolved: { label: t("caseCard.status.resolved"), color: "bg-success text-success-foreground" },
    "under-investigation": { label: t("caseCard.status.underInvestigation"), color: "bg-muted text-muted-foreground" },
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!caseSlug) return;
    // Only navigate if not clicking on an inner link
    if (!(e.target as HTMLElement).closest("a")) {
      navigate(`/case/${caseSlug}`);
    }
  };

  const cardLayout = viewMode === "list" ? "flex-col sm:flex-row h-auto" : "flex-col h-full";
  const articleLayout = viewMode === "list" ? "flex-col sm:flex-row" : "flex-col";
  const imageContainerClass = viewMode === "list" ? "h-48 sm:h-auto sm:w-1/3 shrink-0" : "h-52";

  return (
    <Card
      className={`group relative flex overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] cursor-pointer ${cardLayout}`}
      onClick={handleCardClick}
    >
      <article className={`flex h-full w-full ${articleLayout}`}>
        <div className={`relative overflow-hidden ${imageContainerClass}`}>
          {imageSrc ? (
            <>
              <img
                src={imageSrc}
                alt={t("caseCard.thumbnailAlt", { title })}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-slate-900/5 to-white/10" />
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-200 via-slate-100 to-white" />
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
            <Badge className={`${statusConfig[status].color} shrink-0 rounded-full border-0 px-3 py-1 text-xs font-medium shadow-sm`}>
              {statusConfig[status].label}
            </Badge>

          </div>
        </div>

        <div className="flex flex-1 flex-col bg-card min-w-0">
          <CardHeader className="space-y-2 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
            <CaseCardTags tags={tags} />
            {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
                remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
            <h3 className="line-clamp-2 text-lg font-semibold leading-8 text-foreground">
              {caseSlug ? (
                <Link
                  to={`/case/${caseSlug}`}
                  className="rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {title}
                </Link>
              ) : (
                title
              )}
            </h3>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col px-4 pb-0 pt-4 sm:px-5">
            {!hideDescription && (
              <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
                {allegations && allegations.length > 0 ? allegations[0] : description}
              </p>
            )}

            <div className={hideDescription ? "mt-2 border-t border-border/70 pt-4" : "mt-5 border-t border-border/70 pt-4"}>
              <div className="space-y-2 text-sm leading-5 text-muted-foreground">
                <EntityRow icon={User} label={entitySummary} title={entity} ids={entityIds} />
                <EntityRow icon={MapPin} label={location} ids={locationIds} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <Button variant="primary" asChild className="w-full rounded-2xl py-3" disabled={!caseSlug}>
              {caseSlug ? (
                <Link to={`/case/${caseSlug}`} onClick={(e) => e.stopPropagation()}>{t("common.viewDetails")}</Link>
              ) : (
                <span>{t("common.viewDetails")}</span>
              )}
            </Button>
          </CardFooter>
        </div>
      </article>
    </Card>
  );
};

function CaseCardTags({ tags }: Readonly<{ tags: string[] }>) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-1">
      {tags.slice(0, 2).map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="bg-secondary text-secondary-foreground border border-border/50 px-2.5 py-0.5 text-xs shadow-sm hover:bg-secondary/80"
        >
          {tag}
        </Badge>
      ))}
      {tags.length > 2 && (
        <Badge
          variant="secondary"
          className="bg-secondary text-secondary-foreground border border-border/50 px-2 py-0.5 text-xs shadow-sm"
        >
          +{tags.length - 2}
        </Badge>
      )}
    </div>
  );
}

function EntityRow({ icon: Icon, label, title, ids }: Readonly<{ icon: typeof User; label: string; title?: string; ids?: string[] }>) {
  const to = ids && ids.length > 0 ? entityPath(ids[0]) : null;
  return (
    <div className="flex min-w-0 items-center">
      <Icon className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {to ? (
        <Link
          to={to}
          className="block min-w-0 truncate rounded-sm transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title={title}
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </Link>
      ) : (
        <span className="block min-w-0 truncate" title={title}>
          {label}
        </span>
      )}
    </div>
  );
}
