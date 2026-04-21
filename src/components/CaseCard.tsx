import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User } from "lucide-react";

interface CaseCardProps {
  id: string;
  title: string;
  entity: string;
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

export const CaseCard = ({ id, title, entity, location, date, status, tags = [], description, allegations, entityIds, locationIds, thumbnailUrl }: CaseCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
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
      navigate(`/case/${id}`);
    }
  };

  return (
    <Card
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)]"
      onClick={handleCardClick}
    >
      <div className="relative h-52 overflow-hidden">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={`Thumbnail for ${title}`}
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

          <div className="flex flex-wrap justify-end gap-1">
            {tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs shadow-sm bg-background/50 backdrop-blur-md">
                {tag}
              </Badge>
            ))}
            {tags && tags.length > 2 && (
              <Badge variant="secondary" className="text-xs shadow-sm bg-background/50 backdrop-blur-md">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-card">
        <CardHeader className="space-y-2 px-5 pb-0 pt-5">
          {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
              remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
          <h3 className="line-clamp-2 text-lg font-semibold text-foreground">
            {title}
          </h3>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-5 pb-0 pt-4">
          {allegations && allegations.length > 0 ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {allegations[0]}
            </p>
          ) : (
            <p className="line-clamp-3 text-sm text-muted-foreground">{description}</p>
          )}

          <div className="mt-5 border-t border-border/70 pt-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4 flex-shrink-0" />
                {entityIds && entityIds.length > 0 ? (
                  <Link
                    to={`/entity/${entityIds[0]}`}
                    className="line-clamp-1 hover:text-primary hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {entity}
                  </Link>
                ) : (
                  <span className="line-clamp-1">{entity}</span>
                )}
              </div>

              <div className="flex items-center">
                <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                {locationIds && locationIds.length > 0 ? (
                  <Link
                    to={`/entity/${locationIds[0]}`}
                    className="line-clamp-1 hover:text-primary hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {location}
                  </Link>
                ) : (
                  <span className="line-clamp-1">{location}</span>
                )}
              </div>

              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>{date}</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="mt-auto px-5 pb-5 pt-4">
          <span className="flex w-full items-center justify-center rounded-2xl bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors group-hover:bg-muted/80">
            {t("common.viewDetails")}
          </span>
        </CardFooter>
      </div>
    </Card>
  );
};
