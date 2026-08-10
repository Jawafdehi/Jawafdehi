import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Allegation } from "@/services/api";
import { formatDate } from "@/utils/date";

interface AllegationTimelineProps {
  allegations: Allegation[];
}

const getStatusConfig = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes("verified")) return { label: "Verified", className: "bg-destructive/10 text-destructive" };
  if (normalized.includes("investigation")) return { label: "Under Investigation", className: "bg-warning/10 text-warning" };
  if (normalized.includes("resolved")) return { label: "Resolved", className: "bg-success/10 text-success" };
  return { label: status, className: "bg-muted/10 text-muted-foreground" };
};

const getSeverityConfig = (severity: string) => {
  const normalized = severity.toLowerCase();
  if (normalized === "high") return { label: "High Severity", className: "bg-destructive/10 text-destructive" };
  if (normalized === "medium") return { label: "Medium Severity", className: "bg-warning/10 text-warning" };
  if (normalized === "low") return { label: "Low Severity", className: "bg-muted/10 text-muted-foreground" };
  return { label: severity, className: "bg-muted/10 text-muted-foreground" };
};

export const AllegationTimeline = ({ allegations }: AllegationTimelineProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Allegations Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {allegations.map((item, index) => (
              <div key={item.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 h-8 w-8 flex items-center justify-center rounded-full bg-background border-2 border-primary">
                  <div className="h-3 w-3 rounded-full bg-primary-surface" />
                </div>
                
                <Link 
                  to={`/case/${item.id}`}
                  className="block rounded-lg bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-foreground hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={getStatusConfig(item.status).className}>
                        {getStatusConfig(item.status).label}
                      </Badge>
                      {item.severity && (
                        <Badge className={getSeverityConfig(item.severity).className}>
                          {getSeverityConfig(item.severity).label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(item.date, 'PPP')}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
