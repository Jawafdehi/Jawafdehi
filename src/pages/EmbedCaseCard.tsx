import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getCaseById } from "@/services/jds-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ExternalLink, MapPin, User } from "@/components/icons";
import { formatCaseDateRange } from "@/utils/date";
import { useCaseImage } from "@/lib/use-case-image";
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

  // The uploaded card ladder first, then the deprecated URLs — the same order,
  // and the same "/admin/ paths are not publicly loadable" guard, that every
  // other case surface uses. This card is what an embedding site shows its
  // readers, and the backend's own oEmbed payload already serves a rendition,
  // so reading only the free-text URLs here left the two halves disagreeing.
  //
  // includePlaceholder: false because this card has its OWN no-image treatment
  // below — a short navy band rather than the shared scales illustration — so
  // `src` goes undefined once every candidate has failed and the band renders.
  //
  // Declared above the early returns below because it holds state: hooks cannot
  // be called conditionally.
  const {
    src: thumbnailUrl,
    srcSet,
    onError: advanceImage,
  } = useCaseImage(
    caseData?.thumbnail,
    [caseData?.thumbnail_url, caseData?.banner_url],
    { includePlaceholder: false },
  );

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

  const primaryEntity = getPrimaryEntity(caseData.entities);
  const locationEntity = getLocationEntity(caseData.entities);
  // One card, one line: the DERIVED span of the whole proceedings, not the
  // per-stage list the case page renders. Read off the derived fields — the
  // case_start_date/case_end_date aliases they replace are deprecated.
  const dateRange = formatCaseDateRange(
    caseData.proceedings_started_on,
    caseData.proceedings_decided_on,
    t("cases.status.ongoing")
  );
  // A short description with no letters or digits (some cases carry a lone
  // ".") is not a description; fall through to the allegations instead.
  const description =
    (/[\p{L}\p{N}]/u.test(caseData.short_description ?? "") ? caseData.short_description : "") ||
    caseData.key_allegations?.[0] ||
    caseData.description?.replace(/<[^>]*>/g, "").slice(0, 200) ||
    "";

  return (
    <div className="flex h-full min-h-[360px] flex-col bg-paper font-sans text-paper-foreground">
      <Helmet>
        <title>{caseData.title} - Jawafdehi</title>
      </Helmet>

      <div className="flex flex-1 flex-col overflow-hidden rounded-[20px] border border-border/70 bg-white">
        {/* Thumbnail */}
        {thumbnailUrl ? (
          <div className="relative h-40 overflow-hidden bg-muted">
            <img
              src={thumbnailUrl}
              srcSet={srcSet}
              // The embed renders inside someone else's page at whatever width
              // they gave the iframe; 600px covers the common desktop card.
              sizes="(min-width: 640px) 600px, 100vw"
              alt={caseData.title}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={advanceImage}
            />
          </div>
        ) : (
          <div className="relative h-20 bg-primary-surface" />
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col px-5 py-4">
          <h3 className="font-home-display line-clamp-2 text-xl leading-snug text-primary">
            <Link
              to={`/case/${caseData.slug || id}`}
              target="_parent"
              className="rounded-sm decoration-primary/30 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {caseData.title}
            </Link>
          </h3>

          {description && (
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}

          <div className="mt-auto space-y-1.5 pt-4 text-[13px] text-muted-foreground">
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
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-3">
          <Link
            to={`/case/${caseData.slug || id}`}
            target="_parent"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-surface px-3.5 text-[13px] text-primary-foreground transition-colors hover:bg-primary-surface/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("embedCase.viewOnJawafdehi", "View on Jawafdehi")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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
