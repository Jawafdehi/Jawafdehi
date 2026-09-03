// Featured-case spotlight — the navy lead card of the Featured Cases section
// (mockup C). One case gets the full-width, full-brand treatment: serif title
// on navy, crimson chip, the case photograph bleeding in from the right. The
// supporting cases below it stay on the standard CaseCard.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, User } from "lucide-react";

import { CaseStatusBadge } from "@/components/CaseBadge";
import { Button } from "@/components/ui/button";
import { getCaseStatusLabelKey } from "@/lib/case-badges";
import {
  CASE_PLACEHOLDER_IMAGE,
  caseImageCandidates,
} from "@/lib/case-images";
import { cn } from "@/lib/utils";

type FeaturedCaseSpotlightProps = {
  slug?: string | null;
  title: string;
  entity: string;
  location: string;
  status: "ongoing" | "resolved" | "under-investigation";
  tags?: string[];
  thumbnailUrl?: string;
  bannerUrl?: string;
};

export function FeaturedCaseSpotlight({
  slug,
  title,
  entity,
  location,
  status,
  tags = [],
  thumbnailUrl,
  bannerUrl,
}: Readonly<FeaturedCaseSpotlightProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Same slug-only navigation contract as CaseCard: never fall back to the
  // numeric id (the slug-only API would 404 on it).
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const caseSlug = normalizedSlug && normalizedSlug.toLowerCase() !== "null" ? normalizedSlug : null;

  // Same image fallback chain as CaseCard: thumbnail → banner → placeholder,
  // advancing on load error.
  const imageCandidates = caseImageCandidates(thumbnailUrl, bannerUrl);
  const [imageIndex, setImageIndex] = useState(0);
  const candidateKey = imageCandidates.join("|");
  useEffect(() => {
    setImageIndex(0);
  }, [candidateKey]);
  const imageSrc = imageCandidates[Math.min(imageIndex, imageCandidates.length - 1)];
  const isPlaceholder = imageSrc === CASE_PLACEHOLDER_IMAGE;

  const statusLabel = t(getCaseStatusLabelKey(status));

  const handleCardClick = (e: React.MouseEvent) => {
    if (!caseSlug) return;
    if (!(e.target as HTMLElement).closest("a")) {
      navigate(`/case/${caseSlug}`);
    }
  };

  // Cursor-following crimson glow: mousemove writes CSS vars straight onto the
  // element (no React state, no re-renders); the overlay below reads them.
  // Touch devices never fire mousemove, so the glow simply stays off there.
  const glowRef = useRef<HTMLElement | null>(null);
  const handleGlowMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = glowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  return (
    <article
      ref={glowRef}
      onMouseMove={handleGlowMove}
      className={cn(
        "group relative grid overflow-hidden rounded-3xl bg-primary text-primary-foreground",
        "shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.55)] transition-all duration-300",
        "md:grid-cols-[1.15fr_1fr]",
        caseSlug && "cursor-pointer hover:-translate-y-1 hover:shadow-[0_32px_70px_-30px_hsl(var(--primary)/0.5)]",
      )}
      onClick={handleCardClick}
    >
      {/* The glow itself — soft accent light pooled under the cursor. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(340px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--accent) / 0.18), transparent 70%)",
        }}
      />
      <div className="flex flex-col p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-accent-foreground">
            {t("home.featuredCases.spotlightLabel", "Featured case")}
          </span>
          <CaseStatusBadge status={status}>{statusLabel}</CaseStatusBadge>
        </div>

        {/* NOTE: Dynamic case content (title, entity names) from the Entity API
            remains in English until API-side i18n lands — same as CaseCard. */}
        <h3
          className="mt-5 text-2xl font-bold leading-snug sm:text-3xl lg:text-4xl"
          style={{ fontFamily: '"Vesper Libre", Georgia, "Noto Sans Devanagari", serif' }}
        >
          {caseSlug ? (
            <Link
              to={`/case/${caseSlug}`}
              className="rounded-sm outline-none transition-colors hover:text-primary-foreground/85 focus-visible:ring-2 focus-visible:ring-primary-foreground/60 focus-visible:ring-offset-4 focus-visible:ring-offset-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>

        <div className="mt-5 space-y-2 text-sm text-primary-foreground/75">
          <p className="flex min-w-0 items-center">
            <User className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{entity}</span>
          </p>
          <p className="flex min-w-0 items-center">
            <MapPin className="mr-2 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{location}</span>
          </p>
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary-foreground/25 px-2.5 py-0.5 text-xs text-primary-foreground/80"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-7">
          {/* Design-system primary variant, same as CaseCard. No ArrowRight
              icon: common.viewDetails already ends with an arrow in both
              locales (PR #359 visual review, item 6). */}
          <Button
            asChild={Boolean(caseSlug)}
            disabled={!caseSlug}
            variant="primary"
            className="rounded-2xl px-6"
          >
            {caseSlug ? (
              <Link to={`/case/${caseSlug}`} onClick={(e) => e.stopPropagation()}>
                {t("common.viewDetails")}
              </Link>
            ) : (
              <span>{t("common.viewDetails")}</span>
            )}
          </Button>
        </div>
      </div>

      {/* overflow-hidden: the image scales on hover, and without clipping the
          enlarged edge leaks past the seam onto the navy panel outside the
          blending gradient (PR #359 visual review, item 7). */}
      <div className="relative min-h-[220px] overflow-hidden md:min-h-0">
        <img
          src={imageSrc}
          alt={isPlaceholder ? "" : t("caseCard.thumbnailAlt", { title })}
          loading="lazy"
          decoding="async"
          onError={() => setImageIndex((i) => Math.min(i + 1, imageCandidates.length - 1))}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            !isPlaceholder && "transition-transform duration-500 group-hover:scale-105",
            // The placeholder is a light illustration; dim it into the navy
            // surface instead of letting it glow like a photograph.
            isPlaceholder && "opacity-40 mix-blend-luminosity",
          )}
        />
        {/* Blend the photograph into the navy panel: strong at the seam,
            clear at the far edge. Vertical on mobile (image below content). */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/35 to-transparent md:bg-gradient-to-r" />
      </div>
    </article>
  );
}
