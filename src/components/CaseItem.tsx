import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar } from "lucide-react";
import { Case } from "@/services/api";
import { formatDate } from "@/utils/date";
import { useTranslation } from "react-i18next";
import { translateDynamicText } from "@/lib/translate-dynamic-content";

interface CaseItemProps {
  case: Case;
}

const statusConfig = {
  'Active': { label: 'Active', class: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  'Closed': { label: 'Closed', class: 'bg-gray-500/10 text-gray-700 dark:text-gray-400' },
  'Pending': { label: 'Pending', class: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  'Under Review': { label: 'Under Review', class: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
};

const CaseItem = ({ case: caseData }: CaseItemProps) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  
  const statusInfo = statusConfig[caseData.status as keyof typeof statusConfig] || statusConfig['Pending'];
  const translatedStatus = translateDynamicText(statusInfo.label, currentLang);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg">{caseData.name}</CardTitle>
          <Badge className={statusInfo.class}>{translatedStatus}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {caseData.description}
        </p>

        {caseData.documents && caseData.documents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Documents ({caseData.documents.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {caseData.documents.map((doc, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {doc}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {caseData.timeline && caseData.timeline.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Timeline</span>
            </div>
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {caseData.timeline.slice(0, 3).map((event, index) => (
                <div key={index} className="pl-4">
                  <div className="text-sm font-medium">{event.event}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(event.date)}
                  </div>
                  {event.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {event.description}
                    </div>
                  )}
                </div>
              ))}
              {caseData.timeline.length > 3 && (
                <div className="text-xs text-muted-foreground pl-4">
                  +{caseData.timeline.length - 3} more events
                </div>
              )}
            </div>
          </div>
        )}

        <Link 
          to={`/case/${caseData.id}`}
          className="inline-block text-sm text-primary hover:underline mt-2"
        >
          View Full Case Details →
        </Link>
      </CardContent>
    </Card>
  );
};

export default CaseItem;
