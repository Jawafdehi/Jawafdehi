import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import { chipVariants } from "@/components/ui/chip";
import { getCaseBadgeClassName } from "@/lib/case-badges";
import { casePath } from "@/lib/case-links";
import {
  caseStatusLabelKey,
  formatSeriesBsDate,
  formatSeriesMoney,
  localDigits,
  materialPathFromIri,
  memberCourtCaseNumbers,
  membersBySlug,
  pickSeriesText,
  seriesBigoTotal,
  bigoOverlapTargetOrdinal,
  statusCountEntries,
  timelineView,
  TIMELINE_LATEST,
  type TimelineItem,
} from "@/lib/case-series";
import { entityPath } from "@/lib/entity-links";
import { materialTypeKeyFor } from "@/lib/material-type-labels";
import { cn } from "@/lib/utils";
import type { SeriesDetail, SeriesMember } from "@/types/series";

export const SOURCES_COLLAPSED = 6;

const ghostPill =
  "inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const numberChip = "rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-primary";

function useMemberNumber(members: readonly SeriesMember[]) {
  const { i18n } = useTranslation();
  const bySlug = useMemo(() => membersBySlug(members), [members]);
  return (slug: string | null | undefined) => {
    const member = slug ? bySlug.get(slug) : undefined;
    return member ? localDigits(member.ordinal, i18n.language) : "";
  };
}

/**
 * The key-numbers grid: members, court cases + courts, accused, status, and the
 * total बिगो of distinct claims — or, from an API without `bigo_total`, the
 * largest member claim.
 */
export function SeriesKeyNumbers({ series }: Readonly<{ series: SeriesDetail }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const totals = series.totals;
  const memberNumber = useMemberNumber(series.members);
  const status = statusCountEntries(totals.status_counts)
    .map(([key, n]) => `${localDigits(n, language)} ${t(caseStatusLabelKey(key))}`)
    .join(", ");
  const top = totals.bigo_max;
  const topMember = top ? memberNumber(top.member_slug) : "";
  const total = seriesBigoTotal(totals, series.members);
  const bigoStat: { value: string; label: string; sub?: string } = total
    ? {
        value: formatSeriesMoney(total.amount, language),
        label: t("series.stats.bigoTotal"),
        sub: [
          t("series.stats.bigoTotalSummed", { count: total.summed, n: localDigits(total.summed, language) }),
          total.overlapping > 0
            ? total.targetOrdinal != null
              ? t("series.stats.bigoTotalOverlap", {
                  count: total.overlapping,
                  n: localDigits(total.overlapping, language),
                  target: localDigits(total.targetOrdinal, language),
                })
              : t("series.stats.bigoTotalOverlapElsewhere", {
                  count: total.overlapping,
                  n: localDigits(total.overlapping, language),
                })
            : "",
        ]
          .filter(Boolean)
          .join("; "),
      }
    : {
        value: formatSeriesMoney(top?.amount, language),
        label: topMember
          ? t("series.stats.largestBigoMember", { ordinal: topMember })
          : t("series.stats.largestBigo"),
      };
  const stats: Array<{ value: string; label: string; sub?: string }> = [
    { value: localDigits(totals.member_count, language), label: t("series.stats.members") },
    {
      value: localDigits(totals.court_case_count, language),
      label: t("series.stats.courtCases", { courts: localDigits(totals.court_count, language) }),
    },
    {
      value: totals.accused_count ? localDigits(totals.accused_count, language) : "—",
      label: t("series.stats.accused"),
    },
    { value: status || "—", label: t("series.stats.status") },
    bigoStat,
  ];
  return (
    <section aria-label={t("series.stats.label")} className="mt-8">
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div className="flex flex-col rounded-xl bg-muted px-3.5 py-3" key={stat.label}>
            <dt className="order-2 text-[13px] leading-5 text-muted-foreground">{stat.label}</dt>
            <dd className="order-1 text-xl font-semibold leading-snug text-primary">{stat.value}</dd>
            {stat.sub ? (
              <dd className="order-3 mt-0.5 text-[12.5px] leading-[18px] text-muted-foreground">{stat.sub}</dd>
            ) : null}
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {t(total ? "series.stats.bigoTotalNote" : "series.stats.bigoNote")}
      </p>
    </section>
  );
}

/** The ordered member list: number badge, title link, note, status, बिगो, court-case numbers. */
export function SeriesMemberList({ members }: Readonly<{ members: readonly SeriesMember[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const ordered = useMemo(() => [...members].sort((a, b) => a.ordinal - b.ordinal), [members]);
  return (
    <section className="mt-12" id="members">
      <CaseSectionHeading>{t("series.members.heading")}</CaseSectionHeading>
      <ol className="divide-y divide-border">
        {ordered.map((member) => {
          const note = pickSeriesText(member.note, language) || member.case.short_description || "";
          const numbers = memberCourtCaseNumbers(member);
          return (
            <li className="flex gap-3.5 py-4" key={member.case.slug}>
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                {localDigits(member.ordinal, language)}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  className="text-[17px] font-semibold leading-snug text-primary hover:text-tone-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  to={casePath(member.case.slug)}
                >
                  <span className="sr-only">{t("series.members.case", { ordinal: localDigits(member.ordinal, language) })}: </span>
                  {member.case.title}
                </Link>
                {note ? <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{note}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                  <span className={getCaseBadgeClassName("status", member.case.status, "shadow-none")}>
                    {t(caseStatusLabelKey(member.case.status))}
                  </span>
                  {member.case.bigo != null && member.case.bigo > 0 ? (
                    <span>{t("series.members.bigo", { amount: formatSeriesMoney(member.case.bigo, language) })}</span>
                  ) : null}
                  {member.bigo_overlaps ? <BigoOverlapChip member={member} members={ordered} /> : null}
                  {numbers.length > 0 ? (
                    <span aria-label={t("series.members.courtCases")} className="flex flex-wrap gap-1.5">
                      {numbers.map((number) => (
                        <span className={numberChip} key={number}>
                          {number}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * The muted "within case N's claim" chip on an overlapping member. Its reason
 * shows on hover and keyboard focus, a tap toggles it on touch, Escape closes
 * it, and it prints inline. The reason stays in the DOM (hidden until shown)
 * so the chip's `aria-describedby` always resolves.
 */
function BigoOverlapChip({ member, members }: Readonly<{ member: SeriesMember; members: readonly SeriesMember[] }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [open, setOpen] = useState(false);
  const reasonId = useId();
  const target = bigoOverlapTargetOrdinal(member, members);
  const reason = pickSeriesText(member.bigo_overlaps?.reason, language);
  const label =
    typeof target === "number"
      ? t("series.members.overlap", { ordinal: localDigits(target, language) })
      : t("series.members.overlapElsewhere");
  const chip = "inline-flex items-center rounded-full border border-dashed border-border bg-muted px-2.5 py-0.5 text-[12.5px] text-muted-foreground";
  if (!reason) return <span className={chip}>{label}</span>;
  return (
    <span className="group relative inline-flex print:flex-col print:items-start">
      <button
        aria-describedby={reasonId}
        aria-expanded={open}
        className={cn(chip, "cursor-help hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        type="button"
      >
        {label}
      </button>
      <span
        className={cn(
          "absolute left-0 top-full z-20 mt-1.5 w-max max-w-[min(22rem,80vw)] rounded-lg bg-primary-surface px-2.5 py-1.5 text-[13px] leading-5 text-primary-foreground",
          open ? "block" : "hidden group-hover:block group-focus-within:block",
          "print:static print:mt-1 print:block print:max-w-none print:bg-transparent print:p-0 print:text-muted-foreground",
        )}
        id={reasonId}
        role="tooltip"
      >
        <span className="sr-only">{t("series.members.overlapReason")}: </span>
        {reason}
      </span>
    </span>
  );
}

/** Accused chips linking to the entity pages, with how many member cases name them. */
export function SeriesAccusedList({ series }: Readonly<{ series: SeriesDetail }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const memberNumber = useMemberNumber(series.members);
  if (!series.accused.length) return null;
  return (
    <section className="mt-12" id="accused">
      <CaseSectionHeading>{t("series.accused.heading")}</CaseSectionHeading>
      <ul className="flex flex-wrap gap-2">
        {series.accused.map((person) => {
          const name = pickSeriesText(person.name, language) || person.nes_id;
          const count = person.member_slugs.length;
          const where =
            count > 1
              ? t("series.accused.inCases", { n: localDigits(count, language) })
              : count === 1
                ? t("series.members.case", { ordinal: memberNumber(person.member_slugs[0]) })
                : "";
          const to = entityPath(person.nes_id);
          const body = (
            <>
              <span
                aria-hidden="true"
                className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-border text-[13px]"
              >
                {Array.from(name)[0] ?? "?"}
              </span>
              <span>{name}</span>{" "}
              {where ? <small className="text-xs text-muted-foreground">{where}</small> : null}
            </>
          );
          const chip =
            "inline-flex min-h-9 items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-3 text-sm text-primary";
          return (
            <li key={person.nes_id}>
              {to ? (
                <Link
                  className={cn(chip, "transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                  to={to}
                >
                  {body}
                </Link>
              ) : (
                <span className={chip}>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[13px] text-muted-foreground">{t("series.accused.note")}</p>
    </section>
  );
}

function TimelineRows({
  items,
  memberNumber,
  className,
}: Readonly<{ items: TimelineItem[]; memberNumber: (slug: string | null | undefined) => string; className?: string }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  if (!items.length) return null;
  return (
    <ol className={cn("m-0 list-none p-0", className)}>
      {items.map((item, index) =>
        item.kind === "year" ? (
          <li className="pb-0.5 pt-3.5 text-sm font-bold text-muted-foreground" key={`y-${item.year}-${index}`}>
            {localDigits(item.year, language)}
          </li>
        ) : (
          <li className="flex gap-3.5 border-b border-border py-2.5 text-[15px]" key={`e-${item.event.date}-${index}`}>
            <span className="w-[84px] shrink-0 pt-0.5 text-[13px] text-muted-foreground sm:w-[120px]">
              {formatSeriesBsDate(item.bsDate, language) || item.event.date}
            </span>
            <div className="min-w-0">
              <b className="font-semibold text-primary">{item.event.title}</b>
              {item.event.member_slug && memberNumber(item.event.member_slug) ? (
                <span className={cn(numberChip, "ml-2 font-sans")}>
                  {t("series.members.case", { ordinal: memberNumber(item.event.member_slug) })}
                </span>
              ) : null}
              {item.event.description ? (
                <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{item.event.description}</p>
              ) : null}
            </div>
          </li>
        ),
      )}
    </ol>
  );
}

/** The members' timelines merged: filter chips per member, latest 8 then "show all", BS year headers. */
export function SeriesMergedTimeline({ series }: Readonly<{ series: SeriesDetail }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [memberSlug, setMemberSlug] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const memberNumber = useMemberNumber(series.members);
  const filters = useMemo(
    () =>
      [...series.members]
        .sort((a, b) => a.ordinal - b.ordinal)
        .filter((m) => series.timeline.some((e) => e.member_slug === m.case.slug)),
    [series.members, series.timeline],
  );
  const view = timelineView(series.timeline, memberSlug, showAll);
  if (!series.timeline.length) return null;

  return (
    <section className="mt-12" id="timeline">
      <CaseSectionHeading>{t("series.timeline.heading")}</CaseSectionHeading>
      <div aria-label={t("series.timeline.filter")} className="no-print mb-2 flex flex-wrap gap-1.5" role="group">
        <button
          aria-pressed={memberSlug === null}
          className={cn(chipVariants({ active: memberSlug === null }), "h-9 px-3.5 text-sm")}
          onClick={() => setMemberSlug(null)}
          type="button"
        >
          {t("series.timeline.all", { n: localDigits(series.timeline.length, language) })}
        </button>
        {filters.map((member) => (
          <button
            aria-pressed={memberSlug === member.case.slug}
            className={cn(chipVariants({ active: memberSlug === member.case.slug }), "h-9 px-3.5 text-sm")}
            key={member.case.slug}
            onClick={() => setMemberSlug(member.case.slug)}
            type="button"
          >
            {t("series.members.case", { ordinal: localDigits(member.ordinal, language) })}
          </button>
        ))}
      </div>
      {/* The collapsed older events stay mounted so the page prints whole. */}
      <TimelineRows className="hidden print:block" items={view.earlier} memberNumber={memberNumber} />
      <TimelineRows items={view.visible} memberNumber={memberNumber} />
      {view.total > TIMELINE_LATEST ? (
        <button className={cn(ghostPill, "no-print mt-3")} onClick={() => setShowAll((v) => !v)} type="button">
          {showAll
            ? t("series.timeline.showLatest", { n: localDigits(TIMELINE_LATEST, language) })
            : t("series.timeline.showAll", { n: localDigits(view.total, language) })}
        </button>
      ) : null}
    </section>
  );
}

/** Every member's sources, deduped by the API; collapsed after six, each tagged with its member(s). */
export function SeriesSourceList({ series }: Readonly<{ series: SeriesDetail }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [showAll, setShowAll] = useState(false);
  const memberNumber = useMemberNumber(series.members);
  if (!series.sources.length) return null;
  return (
    <section className="mt-12" id="sources">
      <CaseSectionHeading>
        {t("series.sources.heading")}{" "}
        <small className="text-[15px] text-muted-foreground">({localDigits(series.sources.length, language)})</small>
      </CaseSectionHeading>
      <ul className="m-0 list-none p-0">
        {series.sources.map((source, index) => {
          const hidden = !showAll && index >= SOURCES_COLLAPSED;
          const path = materialPathFromIri(source.material_iri);
          const date = formatSeriesBsDate(source.material.date, language);
          const type = source.material.material_type;
          return (
            <li
              className={cn("flex gap-3.5 border-b border-border py-2.5 text-[15px]", hidden && "hidden print:flex")}
              key={source.material_iri}
            >
              <span className="w-[84px] shrink-0 pt-0.5 text-[13px] text-muted-foreground sm:w-[120px]">
                {date || t("series.sources.undated")}
              </span>
              <div className="min-w-0">
                {path ? (
                  <Link className="break-words text-primary hover:text-tone-blue hover:underline" to={path}>
                    {source.material.display_name}
                  </Link>
                ) : (
                  <span className="break-words">{source.material.display_name}</span>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {source.member_slugs.map((slug) =>
                    memberNumber(slug) ? (
                      <span className={cn(numberChip, "font-sans")} key={slug}>
                        {t("series.members.case", { ordinal: memberNumber(slug) })}
                      </span>
                    ) : null,
                  )}
                  {type ? <span>{t(`dataQuality.materialsByType.type.${materialTypeKeyFor(type)}`)}</span> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {series.sources.length > SOURCES_COLLAPSED ? (
        <button className={cn(ghostPill, "no-print mt-3")} onClick={() => setShowAll((v) => !v)} type="button">
          {showAll
            ? t("series.sources.showLess")
            : t("series.sources.showAll", { n: localDigits(series.sources.length, language) })}
        </button>
      ) : null}
    </section>
  );
}
