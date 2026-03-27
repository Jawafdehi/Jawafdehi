import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer" onClick={handleCardClick}>
      {thumbnailUrl && (
        <div className="w-full h-40 overflow-hidden rounded-t-lg">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge className={statusConfig[status].color}>{statusConfig[status].label}</Badge>
          <div className="flex flex-wrap gap-1">
            {tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags && tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        </div>
        {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
            remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
        <h3 className="text-lg font-semibold text-foreground line-clamp-2">{title}</h3>
      </CardHeader>
      <CardContent>
        {allegations && allegations.length > 0 ? (
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li className="text-sm text-muted-foreground">
              <span>{allegations[0]}</span>
            </li>
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}
        <div className="space-y-2">
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
            <MapPin className="mr-2 h-4 w-4" />
            {locationIds && locationIds.length > 0 ? (
              <Link
                to={`/entity/${locationIds[0]}`}
                className="hover:text-primary hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {location}
              </Link>
            ) : (
              <span>{location}</span>
            )}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{date}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-sm font-medium text-primary hover:underline">{t("common.viewDetails")}</span>
      </CardFooter>
    </Card>
  );
};
