import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getCaseById } from "@/services/jds-api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ExternalLink, MapPin, User } from "lucide-react";
import { formatCaseDateRange } from "@/utils/date";
import { cn } from "@/lib/utils";
import type { JawafEntity } from "@/types/jds";

const RELATION_PRIORITY: Record<string, number> = {
  accused: 1,
  alleged: 2,
  victim: 3,
  witness: 4,
  related: 5,
  opposition: 6,
  unknown: 10,
};

function getPrimaryEntity(entities: JawafEntity[]): JawafEntity | null {
  const nonLocation = entities.filter((e) => e.type !== "location");
  if (nonLocation.length === 0) return null;
  nonLocation.sort(
    (a, b) =>
      (RELATION_PRIORITY[a.type || "unknown"] || 10) -
      (RELATION_PRIORITY[b.type || "unknown"] || 10)
  );
  return nonLocation[0];
}

function getLocationEntity(entities: JawafEntity[]): JawafEntity | null {
  return entities.find((e) => e.type === "location") || null;
}

const EmbedCaseCard = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const {
    data: caseData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["case", id],
    queryFn: () => getCaseById(id!),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-white p-4">
        <div className="w-full max-w-full space-y-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-white p-4">
        <p className="text-sm text-muted-foreground">
          {t("embedCase.unavailable", "Case information unavailable.")}
        </p>
      </div>
    );
  }

  const stateMap: Record<string, { label: string; className: string }> = {
    DRAFT: {
      label: t("embedCase.status.underInvestigation", "Under Investigation"),
      className: "bg-alert-strong/10 text-alert-strong",
    },
    IN_REVIEW: {
      label: t("embedCase.status.underInvestigation", "Under Investigation"),
      className: "bg-alert-strong/10 text-alert-strong",
    },
    PUBLISHED: {
      label: t("embedCase.status.ongoing", "Ongoing"),
      className: "bg-navy-100 text-navy-800",
    },
    CLOSED: {
      label: t("embedCase.status.resolved", "Resolved"),
      className: "bg-success-strong/10 text-success-strong",
    },
  };

  const status = stateMap[caseData.state] || stateMap.PUBLISHED;
  const thumbnailUrl = caseData.thumbnail_url || caseData.banner_url;
  const primaryEntity = getPrimaryEntity(caseData.entities);
  const locationEntity = getLocationEntity(caseData.entities);
  const dateRange = formatCaseDateRange(
    caseData.case_start_date,
    caseData.case_end_date,
    t("cases.status.ongoing")
  );
  const description =
    caseData.short_description ||
    caseData.key_allegations?.[0] ||
    caseData.description?.replace(/<[^>]*>/g, "").slice(0, 200) ||
    "";

  return (
    <div className="flex h-full min-h-[360px] flex-col bg-paper font-sans text-paper-foreground">
      <Helmet>
        <title>{caseData.title} - Jawafdehi</title>
      </Helmet>

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        {/* Thumbnail */}
        {thumbnailUrl ? (
          <div className="relative h-36 overflow-hidden bg-muted">
            <img
              src={thumbnailUrl}
              alt={caseData.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute left-3 top-3">
              <Badge
                className={cn(
                  "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
                  status.className
                )}
              >
                {status.label}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="relative h-20 bg-gradient-to-r from-navy-800 to-navy-700">
            <div className="absolute left-3 top-3">
              <Badge
                className={cn(
                  "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium",
                  status.className
                )}
              >
                {status.label}
              </Badge>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col px-4 py-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            <Link
              to={`/case/${caseData.slug || id}`}
              target="_parent"
              className="hover:text-navy-700 hover:underline"
            >
              {caseData.title}
            </Link>
          </h3>

          {description && (
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          <div className="mt-auto space-y-1 pt-3 text-xs text-muted-foreground">
            {primaryEntity && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {primaryEntity.display_name ||
                    primaryEntity.nes_id ||
                    t("common.unknown")}
                </span>
              </div>
            )}

            {locationEntity && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {locationEntity.display_name ||
                    locationEntity.nes_id ||
                    t("common.unknown")}
                </span>
              </div>
            )}

            {dateRange && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span>{dateRange}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <Link
            to={`/case/${caseData.slug || id}`}
            target="_parent"
            className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900 hover:underline"
          >
            {t("embedCase.viewOnJawafdehi", "View on Jawafdehi")}
            <ExternalLink className="h-3 w-3" />
          </Link>

          <span className="text-xs text-muted-foreground">
            {t("embedCase.provider", "via Jawafdehi")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmbedCaseCard;
