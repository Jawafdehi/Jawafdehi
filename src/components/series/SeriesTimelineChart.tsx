import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ArrowRight, X } from "@/components/icons";
import { casePath } from "@/lib/case-links";
import {
  aboutLead,
  barLabelLayout,
  bsQuarterTicks,
  bsTickLabel,
  buildChartGroups,
  chartDomain,
  courtLabel,
  displayBsDate,
  isOutOfCourt,
  localDigits,
  quarterStep,
  truncateLabel,
  utcToday,
  verdictLabelKey,
  type ChartGroup,
  type ChartGroupBy,
  type ChartRow,
} from "@/lib/case-series";
import { cn } from "@/lib/utils";
import type { SeriesCourtCase, SeriesMember } from "@/types/series";
import { courtCasePath } from "@/utils/court-chain";

// Token colours, so the chart follows the theme (var() resolves inside inline SVG).
const COLOUR = {
  open: "hsl(var(--tone-amber))",
  done: "hsl(var(--success-strong))",
  grid: "hsl(var(--border))",
  groupRule: "hsl(var(--muted-foreground) / 0.45)",
  labelColumn: "hsl(var(--muted))",
  today: "hsl(var(--accent))",
  text: "hsl(var(--primary))",
  mutedText: "hsl(var(--muted-foreground))",
} as const;

const ROW_HEIGHT = 34;
const TOP = 34;
const RIGHT = 24;
const MIN_WIDTH = 760;
const POPUP_WIDTH = 380;

type Popup = { row: ChartRow; left: number; top: number; fromKeyboard: boolean };

export interface SeriesTimelineChartProps {
  courtCases: readonly SeriesCourtCase[];
  members: readonly SeriesMember[];
  /** The chart's "today" (UTC ms); defaults to now. Fixed in tests. */
  today?: number;
}

/**
 * The series' court cases on one time axis: one row per court case, a bar
 * from registration to the verdict (end tick) or to today (arrow) while it is
 * pending, grouped by court (district → High → Supreme → outside court) or by
 * member case, with the group named in a shaded left column. Clicking a bar
 * opens an in-page popup with the case's details and which member it belongs
 * to. Narrow screens scroll the chart sideways.
 */
export function SeriesTimelineChart({ courtCases, members, today: todayProp }: Readonly<SeriesTimelineChartProps>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [groupBy, setGroupBy] = useState<ChartGroupBy>("court");
  const [popup, setPopup] = useState<Popup | null>(null);
  const [measured, setMeasured] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const today = todayProp ?? utcToday();
  const groups = useMemo(
    () => buildChartGroups(courtCases, members, groupBy, today),
    [courtCases, members, groupBy, today],
  );
  const rows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () => setMeasured(element.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const close = useCallback(() => setPopup(null), []);

  // Close on a press outside the popup, and on Escape.
  useEffect(() => {
    if (!popup) return;
    const onPointer = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-chart-row]")) return;
      setPopup(null);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPopup(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [popup]);

  useEffect(() => {
    if (popup?.fromKeyboard) closeRef.current?.focus();
  }, [popup]);

  const width = Math.max(measured || 900, MIN_WIDTH);
  const labelColumn = width < 900 ? 150 : 190;
  const height = TOP + ROW_HEIGHT * rows.length + 12;
  const { lo, hi, spanYears } = chartDomain(rows, today);
  const x = (time: number) => labelColumn + ((time - lo) / (hi - lo)) * (width - labelColumn - RIGHT);
  const ticks = bsQuarterTicks(lo, hi, quarterStep(spanYears));
  const todayX = x(today);

  const openAt = (row: ChartRow, anchor: { clientX: number; clientY: number }, fromKeyboard: boolean) => {
    const box = wrapRef.current?.getBoundingClientRect();
    const wrapWidth = box?.width || width;
    const left = Math.max(8, Math.min(anchor.clientX - (box?.left ?? 0) + 12, wrapWidth - POPUP_WIDTH - 8));
    const top = anchor.clientY - (box?.top ?? 0) + 12;
    setPopup({ row, left, top, fromKeyboard });
  };

  const onRowClick = (row: ChartRow) => (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    openAt(row, event, false);
  };
  const onRowKey = (row: ChartRow) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    openAt(row, { clientX: rect.left + 8, clientY: rect.bottom - 8 }, true);
  };

  const groupLabel = (group: ChartGroup) => {
    if (group.kind === "outOfCourt") return t("series.chart.outOfCourt");
    if (group.kind === "court") return courtLabel(group.courtCase, language);
    const member = group.member;
    if (!member) return group.courtCase.member_slug;
    return `${t("series.members.case", { ordinal: localDigits(member.ordinal, language) })}: ${member.case.title}`;
  };

  const rowNumber = (courtCase: SeriesCourtCase) =>
    courtCase.case_number || t("series.chart.outOfCourtShort");

  let rowIndex = 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div aria-label={t("series.chart.groupBy")} className="inline-flex rounded-full bg-muted p-1" role="group">
          {(["court", "member"] as const).map((value) => (
            <button
              aria-pressed={groupBy === value}
              className={cn(
                "min-h-9 rounded-full px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                groupBy === value ? "bg-surface text-primary shadow-sm" : "text-muted-foreground hover:text-primary",
              )}
              key={value}
              onClick={() => {
                setGroupBy(value);
                setPopup(null);
              }}
              type="button"
            >
              {value === "court" ? t("series.chart.byCourt") : t("series.chart.byMember")}
            </button>
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: COLOUR.open }} />
            {t("series.chart.ongoing")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: COLOUR.done }} />
            {t("series.chart.decidedLegend")}
          </span>
        </p>
      </div>

      <div className="relative" ref={wrapRef}>
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface py-1.5" ref={scrollRef}>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t("series.chart.empty")}</p>
          ) : (
            <svg
              aria-label={t("series.chart.label", { n: localDigits(rows.length, language) })}
              className="block"
              height={height}
              role="group"
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              xmlns="http://www.w3.org/2000/svg"
            >
              {ticks.map((tick) => {
                const tx = x(tick.time);
                return (
                  <g aria-hidden="true" key={tick.time}>
                    <line stroke={COLOUR.grid} x1={tx} x2={tx} y1={TOP - 8} y2={height - 6} />
                    <text fill={COLOUR.mutedText} fontSize={11} textAnchor="middle" x={tx} y={TOP - 14}>
                      {bsTickLabel(tick, language)}
                    </text>
                  </g>
                );
              })}
              <g aria-hidden="true">
                <line stroke={COLOUR.today} strokeDasharray="3 3" x1={todayX} x2={todayX} y1={TOP - 8} y2={height - 6} />
                <text fill={COLOUR.today} fontSize={10} textAnchor="end" x={todayX - 3} y={height - 1}>
                  {t("series.chart.today")}
                </text>
              </g>

              {groups.map((group) => {
                const y0 = TOP + rowIndex * ROW_HEIGHT;
                const groupHeight = ROW_HEIGHT * group.rows.length;
                const label = groupLabel(group);
                const groupRows = group.rows.map((row, j) => {
                  const index = rowIndex++;
                  const y = TOP + index * ROW_HEIGHT + ROW_HEIGHT / 2 + 3;
                  const x1 = x(row.start);
                  const x2 = Math.max(x(row.end), x1 + 4);
                  const colour = row.decided ? COLOUR.done : COLOUR.open;
                  const number = rowNumber(row.courtCase);
                  const about = aboutLead(row.courtCase.about);
                  const { anchorEnd, room } = barLabelLayout({
                    x: x1,
                    x2,
                    width,
                    labelColumn,
                    caseNumberLength: number.length,
                  });
                  const short = truncateLabel(about, room);
                  const court = isOutOfCourt(row.courtCase)
                    ? t("series.chart.outOfCourt")
                    : courtLabel(row.courtCase, language);
                  return (
                    <g key={`${row.courtCase.iri ?? row.courtCase.member_slug}-${index}`}>
                      {j > 0 && (
                        <line
                          aria-hidden="true"
                          stroke={COLOUR.grid}
                          strokeDasharray="3 3"
                          x1={labelColumn - 10}
                          x2={width}
                          y1={y - 14}
                          y2={y - 14}
                        />
                      )}
                      <g
                        aria-haspopup="dialog"
                        aria-label={`${number}, ${court}`}
                        className="group/row cursor-pointer outline-none [&:focus-visible_.row-hit]:stroke-ring"
                        data-chart-row=""
                        onClick={onRowClick(row)}
                        onKeyDown={onRowKey(row)}
                        role="button"
                        tabIndex={0}
                      >
                        <rect
                          className="row-hit"
                          fill="transparent"
                          height={27}
                          rx={6}
                          strokeWidth={2}
                          width={Math.max(x2 - x1 + 24, 160)}
                          x={Math.min(x1, x2) - 8}
                          y={y - 13}
                        />
                        <rect fill={colour} height={8} opacity={row.decided ? 0.9 : 0.6} rx={4} width={x2 - x1} x={x1} y={y + 1} />
                        <circle cx={x1} cy={y + 5} fill={colour} r={5} stroke="hsl(var(--surface))" strokeWidth={1.5} />
                        {row.decided ? (
                          <rect fill={colour} height={14} width={4} x={x2 - 2} y={y - 2} />
                        ) : (
                          <path d={`M${x2},${y - 1} L${x2 + 9},${y + 5} L${x2},${y + 11} Z`} fill={colour} />
                        )}
                        <text
                          className="group-hover/row:fill-tone-blue"
                          dx={anchorEnd ? -14 : 0}
                          fill={COLOUR.text}
                          fontSize={11}
                          textAnchor={anchorEnd ? "end" : "start"}
                          x={anchorEnd ? x2 + 12 : x1}
                          y={y - 3}
                        >
                          <tspan fontWeight={700}>{number}</tspan>
                          {short ? ` · ${short}` : ""}
                        </text>
                      </g>
                    </g>
                  );
                });
                return (
                  <g data-chart-group={group.key} key={group.key}>
                    <line aria-hidden="true" stroke={COLOUR.groupRule} x1={0} x2={width} y1={y0} y2={y0} />
                    <rect aria-hidden="true" fill={COLOUR.labelColumn} height={groupHeight} width={labelColumn - 10} x={0} y={y0} />
                    <foreignObject height={Math.max(groupHeight - 8, 18)} width={labelColumn - 20} x={6} y={y0 + 4}>
                      <div
                        className="flex h-full items-center overflow-hidden text-[12.5px] font-semibold leading-snug text-primary"
                        title={label}
                      >
                        <span className="line-clamp-3">{label}</span>
                      </div>
                    </foreignObject>
                    {groupRows}
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {popup && (
          <ChartPopup
            closeRef={closeRef}
            left={popup.left}
            onClose={close}
            popupRef={popupRef}
            row={popup.row}
            top={popup.top}
          />
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("series.chart.howToRead")}</p>
    </div>
  );
}

function ChartPopup({
  row,
  left,
  top,
  onClose,
  popupRef,
  closeRef,
}: Readonly<{
  row: ChartRow;
  left: number;
  top: number;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement>;
  closeRef: React.RefObject<HTMLButtonElement>;
}>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const c = row.courtCase;
  const outOfCourt = isOutOfCourt(c);
  const court = outOfCourt ? t("series.chart.outOfCourt") : courtLabel(c, language);
  const heading = [c.case_number, court].filter(Boolean).join(" · ");
  const registered = displayBsDate(c.registration_date_bs, c.registration_date_ad, language);
  const verdictDate = displayBsDate(c.verdict_date_bs, c.verdict_date_ad, language);
  const verdictKey = verdictLabelKey(c.verdict_type);
  const status =
    [c.case_status, verdictKey ? t(verdictKey) : null].filter(Boolean).join(" · ") ||
    (row.decided ? t("series.chart.decided") : t("series.chart.pending"));
  const href = c.iri ? courtCasePath(c.iri) : null;
  const member = row.member;

  return (
    <div
      aria-label={heading}
      className="absolute z-20 w-[min(380px,calc(100%-16px))] rounded-xl border border-border bg-surface p-4 text-[13.5px] leading-normal text-primary shadow-lg"
      ref={popupRef}
      role="dialog"
      style={{ left, top }}
    >
      <button
        aria-label={t("series.chart.close")}
        className="float-right -mr-1 -mt-1 ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClose}
        ref={closeRef}
        type="button"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
      <h4 className="text-[15px] font-semibold">{heading}</h4>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        {registered
          ? `${outOfCourt ? t("series.chart.started", { date: registered }) : t("series.chart.registered", { date: registered })} · `
          : ""}
        <b style={{ color: row.decided ? COLOUR.done : COLOUR.open }}>{status}</b>
        {verdictDate ? ` (${verdictDate})` : ""}
      </p>
      {c.about ? <p className="my-2">{c.about}</p> : null}
      {member ? (
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {t("series.chart.inSeries")}{" "}
          <b className="text-primary">{t("series.members.case", { ordinal: localDigits(member.ordinal, language) })}</b>
          {" — "}
          {member.case.title}
        </p>
      ) : null}
      {!outOfCourt && (c.plaintiff || c.defendant) ? (
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          <b>{t("series.chart.plaintiff")}:</b> {c.plaintiff || "—"}
          <br />
          <b>{t("series.chart.defendant")}:</b> {c.defendant || "—"}
        </p>
      ) : null}
      {href || member ? (
        <p className="mt-2">
          <Link
            className="inline-flex items-center gap-1 font-medium text-tone-blue hover:underline"
            to={href ?? casePath(member!.case.slug)}
          >
            {href ? t("series.chart.openCourtCase") : t("series.chart.openCase")}
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}
