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
  entityIds?: number[]; // Jawaf entity IDs
  locationIds?: number[]; // Jawaf entity IDs
}

export const CaseCard = ({ id, title, entity, location, date, status, tags = [], description, entityIds, locationIds }: CaseCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const statusConfig = {
    ongoing: { label: t("caseCard.status.ongoing"), color: "bg-alert text-alert-foreground" },
    resolved: { label: t("caseCard.status.resolved"), color: "bg-success text-success-foreground" },
    "under-investigation": { label: t("caseCard.status.underInvestigation"), color: "bg-muted text-muted-foreground" },
  };

  const handleCardClick = (e: React.MouseEvent) => {
    try {
      // Only navigate if not clicking on an inner link
      if (!(e.target as HTMLElement).closest("a")) {
        navigate(`/case/${id}`);
      }
    } catch (error) {
      console.error('Error navigating to case:', id, error);
    }
  };

  // Safely handle entity and location data with fallbacks
  const safeEntity = entity || t("caseCard.unknownEntity", "Unknown Entity");
  const safeLocation = location || t("caseCard.unknownLocation", "Unknown Location");
  const safeTitle = title || t("caseCard.untitledCase", "Untitled Case");
  const safeDescription = description || t("caseCard.noDescription", "No description available");
  const safeEntityIds = Array.isArray(entityIds) ? entityIds : [];
  const safeLocationIds = Array.isArray(locationIds) ? locationIds : [];

  return (
    <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer" onClick={handleCardClick}>
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
        <h3 className="text-lg font-semibold text-foreground line-clamp-2">{safeTitle}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{safeDescription}</p>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="mr-2 h-4 w-4 flex-shrink-0" />
            {safeEntityIds && safeEntityIds.length > 0 ? (
              <Link
                to={`/entity/${safeEntityIds[0]}`}
                className="line-clamp-1 hover:text-primary hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {safeEntity}
              </Link>
            ) : (
              <span className="line-clamp-1">{safeEntity}</span>
            )}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4" />
            {safeLocationIds && safeLocationIds.length > 0 ? (
              <Link
                to={`/entity/${safeLocationIds[0]}`}
                className="hover:text-primary hover:underline transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {safeLocation}
              </Link>
            ) : (
              <span>{safeLocation}</span>
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
