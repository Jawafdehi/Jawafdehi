import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaseDetail, JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/nes";
import { formatCaseDateRange } from "@/utils/date";
import { getPrimaryName } from "@/utils/nes-helpers";
import { translateDynamicText } from "@/lib/translate-dynamic-content";

interface CaseDetailBannerProps {
  caseData: CaseDetail;
  resolvedEntities: Record<string, Entity>;
  homeLabel?: string;
  casesLabel?: string;
  actions?: ReactNode;
}

export function CaseDetailBanner({
  caseData,
  resolvedEntities,
  homeLabel,
  casesLabel,
  actions,
}: CaseDetailBannerProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const title = caseData.title;
  const bannerUrl = caseData.banner_url || caseData.thumbnail_url;
  const hasBanner = Boolean(bannerUrl?.trim());
  const stateMap: Record<string, string> = {
    DRAFT: "caseDetail.status.underInvestigation",
    IN_REVIEW: "caseDetail.status.underInvestigation",
    PUBLISHED: "caseDetail.status.ongoing",
    CLOSED: "caseDetail.status.resolved",
  };
  const statusKey = caseData.state ? stateMap[caseData.state] : "caseDetail.status.ongoing";
  const statusLabel = t(statusKey || "caseDetail.status.ongoing");
  const caseTypeLabel = caseData.case_type === "CORRUPTION" ? t("cases.type.corruption") : t("cases.type.brokenPromise");
  const dateRange = formatCaseDateRange(caseData.case_start_date, caseData.case_end_date, t("cases.status.ongoing"));
  const notAvailableLabel = t("common.notAvailable");

  const getEntityDisplayName = (caseEntity: JawafEntity) => {
    const entity = caseEntity.nes_id ? resolvedEntities[caseEntity.nes_id] : null;
    const lang = currentLang === "ne" ? "ne" : "en";
    const fallbackLang = lang === "ne" ? "en" : "ne";
    const displayName =
      (entity
        ? getPrimaryName(entity.names, lang) || getPrimaryName(entity.names, fallbackLang)
        : "") ||
      caseEntity.display_name ||
      caseEntity.nes_id ||
      "Unknown";
    return translateDynamicText(displayName, currentLang);
  };

  const accusedEntities = caseData.entities.filter((entity) => entity.type === "accused");
  const locationEntities = caseData.entities.filter((entity) => entity.type === "location");

  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white no-print">
      {hasBanner ? (
        <img
          src={bannerUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_34%),linear-gradient(135deg,#0f172a,#020617)]" />
      )}
      <div className="absolute inset-0 bg-slate-950/80" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/90 to-transparent" />

      <div className="container relative z-10 mx-auto max-w-8xl px-4 py-10 sm:py-14 lg:py-16">
        <nav aria-label="breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-white/70">
          <Link to="/" className="transition-colors hover:text-white">
            {homeLabel || t("nav.home")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/cases" className="transition-colors hover:text-white">
            {casesLabel || t("nav.cases")}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="max-w-[20rem] truncate text-white/80 sm:max-w-md">{title}</span>
        </nav>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-0 bg-alert px-3 py-1 text-xs text-alert-foreground">
            {statusLabel}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border-white/15 px-3 py-1 text-xs backdrop-blur",
              caseData.case_type === "CORRUPTION"
                ? "bg-destructive/80 text-white"
                : "bg-orange-500/80 text-white"
            )}
          >
            {caseTypeLabel}
          </Badge>
          {caseData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-full bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20">
              {translateDynamicText(tag, currentLang)}
            </Badge>
          ))}
        </div>

        <h1 className="max-w-4xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>

        <div className="mt-6 grid gap-3 text-sm text-white/80">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/70" />
            <div className="flex flex-wrap gap-1">
              <span className="sr-only">{t("entityCard.alleged")}: </span>
              {accusedEntities.length > 0
                ? accusedEntities.map((entity, index) => (
                    <span key={entity.id}>
                      <Link to={`/entity/${entity.id}`} className="text-white hover:underline">
                        {getEntityDisplayName(entity)}
                      </Link>
                      {index < accusedEntities.length - 1 && ", "}
                    </span>
                  ))
                : notAvailableLabel}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/70" />
            <div className="flex flex-wrap gap-1">
              <span className="sr-only">{t("entityCard.location")}: </span>
              {locationEntities.length > 0
                ? locationEntities.map((entity, index) => (
                    <span key={entity.id}>
                      <Link to={`/entity/${entity.id}`} className="text-white hover:underline">
                        {getEntityDisplayName(entity)}
                      </Link>
                      {index < locationEntities.length - 1 && ", "}
                    </span>
                  ))
                : notAvailableLabel}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 flex-shrink-0 text-white/70" />
            <span>
              {t("caseDetail.period")}: {dateRange}
            </span>
          </div>
        </div>

        {actions ? (
          <div className="mt-7 flex flex-wrap items-center gap-3 no-print">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
