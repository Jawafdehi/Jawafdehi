import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User } from "lucide-react";

interface CaseCardProps {
  identifier: string;
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

export const CaseCard = ({ identifier, title, entity, location, date, status, tags = [], description, allegations, entityIds, locationIds, thumbnailUrl }: CaseCardProps) => {
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
      navigate(`/case/${identifier}`);
    }
  };

  return (
    <Card className="relative h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer overflow-hidden group" onClick={handleCardClick}>
      {/* Conditionally render image only when valid thumbnail exists */}
      {imageSrc ? (
        <>
          <img
            src={imageSrc}
            alt={`Thumbnail for ${title}`}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            className="absolute inset-0 z-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Semi-transparent white overlay for text readability */}
          <div className="absolute inset-0 z-[1] bg-white/70" />
        </>
      ) : (
        /* White background when no thumbnail */
        <div className="absolute inset-0 z-0 bg-white" />
      )}
      <div className="relative z-10 flex flex-col h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge className={statusConfig[status].color}>{statusConfig[status].label}</Badge>
            <div className="flex flex-wrap gap-1">
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
          {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
              remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
          <h3 className="text-lg font-semibold text-foreground line-clamp-2">{title}</h3>
        </CardHeader>
        <CardContent className="flex-grow">
          {allegations && allegations.length > 0 ? (
            <ul className="list-disc list-inside mb-4 space-y-0.5">
              <li className="text-sm text-muted-foreground">
                <span>{allegations[0]}</span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">{description}</p>
          )}
          <div className="space-y-1 mt-3">
            <div className="flex items-center text-sm text-muted-foreground">
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
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
              {locationIds && locationIds.length > 0 ? (
                <Link
                  to={`/entity/${locationIds[0]}`}
                  className="hover:text-primary hover:underline transition-colors line-clamp-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {location}
                </Link>
              ) : (
                <span className="line-clamp-1">{location}</span>
              )}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{date}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-auto">
          <span className="text-sm font-medium text-primary hover:underline">{t("common.viewDetails")}</span>
        </CardFooter>
      </div>
    </Card>
  );
};
