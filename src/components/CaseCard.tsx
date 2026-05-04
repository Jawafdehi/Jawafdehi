import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { TFunction } from "i18next";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User } from "lucide-react";

const nepaliDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

interface CaseCardProps {
  id: string;
  slug?: string | null; // URL-friendly slug for navigation
  title: string;
  entity: string;
  entityNames?: string[];
  location: string;
  date: string;
  status: "ongoing" | "resolved" | "under-investigation";
  tags?: string[];
  description: string;
  allegations?: string[]; // Key allegations array
  entityIds?: number[]; // Jawaf entity IDs
  locationIds?: number[]; // Jawaf entity IDs
  thumbnailUrl?: string; //Thumbnail image
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

export const CaseCard = ({ id, slug, title, entity, entityNames, location, date, status, tags = [], description, allegations, entityIds, locationIds, thumbnailUrl }: CaseCardProps) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const entitySummary = getEntitySummary(entity, entityNames, i18n.language, t);

  // Normalize case identifier once for all navigation paths
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const caseIdentifier = normalizedSlug && normalizedSlug.toLowerCase() !== "null" ? normalizedSlug : id;

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
    // Only navigate if not clicking on an inner link
    if (!(e.target as HTMLElement).closest("a")) {
      navigate(`/case/${caseIdentifier}`);
    }
  };

  return (
    <Card
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] cursor-pointer"
      onClick={handleCardClick}
    >
      <article className="flex h-full flex-col">
        <div className="relative h-52 overflow-hidden">
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

        <div className="flex flex-1 flex-col bg-card">
          <CardHeader className="space-y-2 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
            {tags && tags.length > 0 && (
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
            )}
            {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
                remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
            <h3 className="line-clamp-2 text-lg font-semibold leading-8 text-foreground">
              <Link 
                to={`/case/${caseIdentifier}`} 
                className="rounded-sm outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                {title}
              </Link>
            </h3>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col px-4 pb-0 pt-4 sm:px-5">
            {allegations && allegations.length > 0 ? (
              <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">
                {allegations[0]}
              </p>
            ) : (
              <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{description}</p>
            )}

            <div className="mt-5 border-t border-border/70 pt-4">
              <div className="space-y-2 text-sm leading-5 text-muted-foreground">
                <div className="flex min-w-0 items-center">
                  <User className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {entityIds && entityIds.length > 0 ? (
                    <Link
                      to={`/entity/${entityIds[0]}`}
                      className="block min-w-0 truncate rounded-sm transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      title={entity}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entitySummary}
                    </Link>
                  ) : (
                    <span className="block min-w-0 truncate" title={entity}>
                      {entitySummary}
                    </span>
                  )}
                </div>

                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {locationIds && locationIds.length > 0 ? (
                    <Link
                      to={`/entity/${locationIds[0]}`}
                      className="line-clamp-1 rounded-sm transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {location}
                    </Link>
                  ) : (
                    <span className="line-clamp-1">{location}</span>
                  )}
                </div>

                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{date}</span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <Button variant="primary" asChild className="w-full rounded-2xl py-3">
              <Link to={`/case/${caseIdentifier}`} onClick={(e) => e.stopPropagation()}>{t("common.viewDetails")}</Link>
            </Button>
          </CardFooter>
        </div>
      </article>
    </Card>
  );
};
