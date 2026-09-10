// Generative "data portrait" thumbnail — the tier-3 fallback a case card
// renders when it has no usable image (no editor hero, no thumbnail, no
// banner, or all of them failed to load).
//
// The design is amount-led: the बिगो figure is the hero element, set in the
// display serif; a radial glyph behind it encodes the same amount as an arc
// (banded scale — see bigoArcFraction) plus the accused count as a dot ring
// and timeline events as centre spokes. Cases without an amount lead with
// their case-type label over a dashed ring, so the layout never breaks.
//
// Deliberately outcome-neutral: dots are a plain count with no per-verdict
// styling. Verdict nuance belongs on the case detail page, not a thumbnail.
//
// All colors come from theme tokens (brand test forbids hardcoded hex), and
// everything is derived from the case's own fields hashed off the slug, so a
// given case renders identically on every visit.

import { useTranslation } from "react-i18next";

import {
  bigoArcFraction,
  formatBigoCompact,
  formatCount,
  hashSlug,
} from "@/lib/case-thumbnail";
import { cn } from "@/lib/utils";
import { getCaseTypeLabelKey } from "@/utils/case-entities";

export interface CaseThumbnailProps {
  slug: string;
  bigo?: number | null;
  caseType?: string | null;
  accusedCount?: number;
  timelineCount?: number;
}

// Glyph geometry, in the SVG's 400x225 viewBox space. The glyph sits in the
// upper right so the typographic lead owns the lower left (and stays clear of
// the status badge CaseCard overlays at the top corners).
const CX = 290;
const CY = 88;
const RING_R = 62;
const DOT_RING_R = RING_R - 18;
const MAX_DOTS = 12;
const MAX_SPOKES = 16;

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

export const CaseThumbnail = ({ slug, bigo, caseType, accusedCount = 0, timelineCount = 0 }: CaseThumbnailProps) => {
  const { t, i18n } = useTranslation();
  const language = typeof i18n.language === "string" ? i18n.language : "en";

  const hasAmount = typeof bigo === "number" && bigo > 0;
  const compact = hasAmount ? formatBigoCompact(bigo, language) : null;
  // Known types localize via their shared label key; unknown types humanize the
  // raw value rather than mislabelling (mirrors getFacetItemLabel's contract).
  const caseTypeKey = getCaseTypeLabelKey(caseType);
  const caseTypeLabel = caseTypeKey
    ? t(caseTypeKey)
    : caseType
      ? caseType.replace(/_/g, " ").toLowerCase()
      : t("caseCard.generativeThumbnail.caseFallback");

  // Per-case rotation so neighbouring cards with equal counts still differ.
  const rotation = (hashSlug(slug) % 360) * (Math.PI / 180) * 0.05;

  // Amount arc, centred on 12 o'clock and swept by the banded fraction.
  const fraction = bigoArcFraction(bigo);
  const sweep = fraction * Math.PI * 1.9;
  const arcStart = -Math.PI / 2 - sweep / 2;
  const p1 = polar(CX, CY, RING_R, arcStart);
  const p2 = polar(CX, CY, RING_R, arcStart + sweep);

  const dotCount = Math.min(accusedCount, MAX_DOTS);
  const overflow = Math.max(accusedCount - MAX_DOTS, 0);
  const spokeCount = Math.min(timelineCount, MAX_SPOKES);

  // The visual is decorative-plus: the same facts render as text below, but a
  // screen reader should still get one coherent sentence, not SVG soup.
  const summary = t("caseCard.generativeThumbnail.summary", {
    amount: compact ? `${compact.prefix} ${compact.value} ${compact.unit}`.trim() : caseTypeLabel,
    accused: accusedCount,
    events: timelineCount,
  });

  return (
    <div className="relative h-full w-full bg-primary-surface" role="img" aria-label={summary}>
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 225"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Ring track + amount arc (dashed ring when there is no amount). */}
        {hasAmount ? (
          <>
            <circle cx={CX} cy={CY} r={RING_R} fill="none" stroke="hsl(var(--primary-foreground) / 0.10)" strokeWidth="7" />
            <path
              d={`M${p1.x} ${p1.y} A${RING_R} ${RING_R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${p2.x} ${p2.y}`}
              fill="none"
              stroke="hsl(var(--accent) / 0.75)"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </>
        ) : (
          <circle
            cx={CX}
            cy={CY}
            r={RING_R}
            fill="none"
            stroke="hsl(var(--primary-foreground) / 0.12)"
            strokeWidth="7"
            strokeDasharray="2 9"
          />
        )}

        {/* Accused dots — a plain count (capped, overflow rendered as text). */}
        {Array.from({ length: dotCount }, (_, i) => {
          const angle = (i / dotCount) * Math.PI * 2 - Math.PI / 2 + rotation;
          const { x, y } = polar(CX, CY, DOT_RING_R, angle);
          return (
            <circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r="3.4"
              fill="none"
              stroke="hsl(var(--primary-foreground) / 0.5)"
              strokeWidth="1.3"
            />
          );
        })}

        {/* Timeline spokes. */}
        {Array.from({ length: spokeCount }, (_, i) => {
          const angle = (i / spokeCount) * Math.PI * 2 - Math.PI / 2 + rotation;
          const inner = polar(CX, CY, 10, angle);
          const outer = polar(CX, CY, 24, angle);
          return (
            <line
              key={`spoke-${i}`}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="hsl(var(--primary-foreground) / 0.35)"
              strokeWidth="1.4"
            />
          );
        })}
        <circle cx={CX} cy={CY} r="6" fill="hsl(var(--primary-foreground) / 0.55)" />
      </svg>

      {/* Bottom scrim so the lead text clears the glyph at every size. */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-surface via-transparent to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/60">
          {hasAmount ? t("caseCard.generativeThumbnail.amountKicker") : t("caseCard.generativeThumbnail.typeKicker")}
        </p>
        {compact ? (
          <p className="font-display text-3xl font-black leading-tight text-primary-foreground">
            {compact.prefix} {compact.value}
            {compact.unit ? <span className="ml-1 text-xl font-bold opacity-85">{compact.unit}</span> : null}
          </p>
        ) : (
          <p className={cn("font-display text-2xl font-black leading-tight text-primary-foreground", !caseTypeKey && "capitalize")}>
            {caseTypeLabel}
          </p>
        )}
        <p className="mt-1 text-xs text-primary-foreground/70">
          {accusedCount > 0 ? (
            <>
              <span className="font-bold text-primary-foreground/90">{formatCount(accusedCount, language)}</span>{" "}
              {t("caseCard.generativeThumbnail.accused")}
              {overflow > 0 ? ` +${formatCount(overflow, language)}` : ""}
              {timelineCount > 0 ? " · " : ""}
            </>
          ) : null}
          {timelineCount > 0 ? (
            <>
              <span className="font-bold text-primary-foreground/90">{formatCount(timelineCount, language)}</span>{" "}
              {t("caseCard.generativeThumbnail.events")}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
};
