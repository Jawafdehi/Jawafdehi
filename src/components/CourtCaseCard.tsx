import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, FileText, Landmark } from "lucide-react";
import { CaseStatusBadge } from "@/components/CaseBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  courtStatusBadgeValue,
  courtTypeValue,
  formatCourtName,
  type CourtTypeValue,
} from "@/utils/court-case-format";
import { cn } from "@/lib/utils";


export interface CourtCaseCardProps {
  caseNumber?: string | null;
  court?: string | null;
  // The API's `court_type` for this case. Optional: absent on documents indexed
  // before the field existed, and `courtTypeValue` then derives the tier from
  // `court` instead.
  courtType?: string | null;
  registrationDate?: string | null;
  registrationDateBs?: string | null;
  status?: string | null;
  title: string;
  url: string;
  viewMode?: "card" | "list";
}

function displayCourtStatus(status: string) {
  const spaced = status.replace(/[_-]+/g, " ").trim();
  if (spaced !== spaced.toUpperCase()) return spaced;
  return spaced
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

// The top-down wash encodes the COURT TIER. It used to encode the case status,
// which duplicated the status pill sitting on top of it while telling the
// reader nothing about which court they were looking at.
//
// Colours are the `--court-*` reds and browns (see src/index.css for how that
// ladder was picked and measured). Note they are deliberately NOT the
// success/alert tokens the pill uses, so wash and pill can no longer be
// confused for each other.
//
// THE ALPHA RISES WITH TIER, and that is doing real work rather than decorating.
// A tint is alpha-diluted against a near-white card, so at one flat alpha the
// four collapse: at the old flat 0.09 the closest pair measured deltaE00 2.4 in
// normal vision and 0.5 under red-green colour blindness — invisible. Raising
// alpha as the colour darkens restores the lightness ladder that dilution
// destroys.
//
// These values were searched, not guessed, against two hard constraints: the
// card title must hold AA on the deepest wash (4.56:1 here, floor 4.5, which is
// what caps supreme at 0.36), and District/High must be unmistakable — that
// pair was the reported failure. Result: District/High 13.5 deltaE00 (up from
// 6.2), worst pair overall 7.4, worst under red-green colour blindness 5.3.
//
// This is still the honest ceiling for a tint; undiluted these four separate by
// 13.8 and 8.9. Re-measure before retuning any of these numbers — raising a
// single alpha trades directly against the title contrast above it.
const COURT_TYPE_GRADIENTS: Record<CourtTypeValue, string> = {
  district:
    "[background-image:linear-gradient(to_bottom,hsl(var(--court-district)/0.18)_0%,transparent_44%)]",
  high: "[background-image:linear-gradient(to_bottom,hsl(var(--court-high)/0.28)_0%,transparent_44%)]",
  special:
    "[background-image:linear-gradient(to_bottom,hsl(var(--court-special)/0.30)_0%,transparent_44%)]",
  supreme:
    "[background-image:linear-gradient(to_bottom,hsl(var(--court-supreme)/0.36)_0%,transparent_44%)]",
};

function courtTypeGradientClass(courtType: CourtTypeValue | null) {
  return courtType ? COURT_TYPE_GRADIENTS[courtType] : "";
}

export function CourtCaseCard({
  caseNumber,
  court,
  courtType,
  registrationDate,
  registrationDateBs,
  status,
  title,
  url,
  viewMode = "card",
}: Readonly<CourtCaseCardProps>) {
  const { t, i18n } = useTranslation();
  const isCard = viewMode === "card";
  const language =
    typeof i18n.language === "string" ? i18n.language : "en";
  const courtName = formatCourtName(court, language);
  const registered =
    language.startsWith("ne") && registrationDateBs
      ? registrationDateBs
      : registrationDate || registrationDateBs || "";
  const viewCaseLabel = t("courtCaseDetail.viewCase", "View case");
  const statusBadgeValue = status ? courtStatusBadgeValue(status) : null;
  const courtTier = courtTypeValue(court, courtType);

  return (
    <Link
      aria-label={`${viewCaseLabel}: ${title}`}
      className={cn(
        "group block h-full bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] ring-1 ring-border/40 transition-[transform,box-shadow,background-color] duration-200 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none",
        courtTypeGradientClass(courtTier),
        isCard
          // The floor used to be 17rem/19rem, which is 272-304px, against a
          // court case whose content measures 150-210px. That left 72-80px of
          // dead air above the "view case" row on every card with no status
          // pill, because `mt-auto` pins that row to a bottom the content never
          // reaches. It does NOT need to be tall to keep the grid tidy: the
          // cards are grid items with `h-full` and the default `stretch`, so
          // every card in a row already matches the tallest one in that row.
          // The floor only has to stop a sparse card collapsing into a stub.
          ? "min-h-[13rem] rounded-2xl p-4 motion-safe:hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(15,23,42,0.35)] sm:rounded-3xl sm:p-5 xl:p-6"
          : "min-h-40 rounded-2xl p-4 hover:bg-muted/20 sm:p-5",
      )}
      to={url}
    >
      <article className="flex h-full min-w-0 flex-col">
        {status ? (
          <div>
            <CaseStatusBadge
              className="max-w-full"
              status={statusBadgeValue}
            >
              <span className="truncate">{displayCourtStatus(status)}</span>
            </CaseStatusBadge>
          </div>
        ) : null}

        <h3
          className={cn(
            "break-words text-pretty font-semibold text-primary",
            status ? "mt-4 sm:mt-5" : "mt-1",
            isCard
              ? "line-clamp-3 text-lg leading-6 sm:text-xl sm:leading-7"
              : "line-clamp-2 text-base leading-5",
          )}
        >
          {title}
        </h3>

        <div
          className={cn(
            "space-y-3 text-sm leading-5 text-muted-foreground",
            isCard ? "mt-5 sm:mt-6" : "mt-5 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0",
          )}
        >
          {caseNumber ? (
            <div className="flex min-w-0 items-center gap-2.5 text-foreground sm:gap-3">
              <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-primary/80" />
              <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]" translate="no">
                {caseNumber}
              </span>
            </div>
          ) : null}
          {courtName ? (
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <Landmark aria-hidden="true" className="h-5 w-5 shrink-0 text-primary/80" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{courtName}</span>
            </div>
          ) : null}
          {registered ? (
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-primary/80" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {t("caseDetail.courtRegistered", "Registered")}: {registered}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-end gap-2 pt-5 text-sm font-semibold text-success-strong sm:pt-6">
          {viewCaseLabel}
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
          />
        </div>
      </article>
    </Link>
  );
}

export function CourtCaseCardSkeleton({
  viewMode = "card",
}: Readonly<{ viewMode?: "card" | "list" }>) {
  const isCard = viewMode === "card";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full flex-col bg-card shadow-[0_10px_28px_-18px_rgba(15,23,42,0.45)] ring-1 ring-border/40",
        isCard
          // Tracks the live card's floor (see the note there) so the grid does
          // not jump when the skeleton is swapped out for real results.
          ? "min-h-[13rem] rounded-2xl p-4 sm:rounded-3xl sm:p-5 xl:p-6"
          : "min-h-40 rounded-2xl p-4 sm:p-5",
      )}
      data-court-case-card-skeleton=""
    >
      <Skeleton className="h-7 w-28 rounded-full" />
      <div className="mt-4 space-y-2 sm:mt-5">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </div>
      <div
        className={cn(
          "mt-5 space-y-3 sm:mt-6",
          !isCard && "lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0",
        )}
      >
        {["w-28", "w-36", "w-40"].map((width) => (
          <div className="flex items-center gap-2.5 sm:gap-3" key={width}>
            <Skeleton className="h-5 w-5 shrink-0 rounded-md" />
            <Skeleton className={cn("h-4", width)} />
          </div>
        ))}
      </div>
      <div className="mt-auto flex justify-end pt-5 sm:pt-6">
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}
