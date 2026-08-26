import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { toNepaliNumerals } from "@/utils/bs-calendar";

type EyebrowTone = "accent" | "primary";

type MarkerEyebrowProps = {
  children: ReactNode;
  className?: string;
  tone?: EyebrowTone;
};

/**
 * Catalogue form — the /materials archive register label:
 * `<Eyebrow index={2} ne="श्रृंखला" en="SERIES" />` renders "०२ · श्रृंखला" in
 * Nepali and "02 · SERIES" in English, with a seal-red tick before the index.
 * This exact pattern used to be duplicated per section; it lives here once.
 */
type CatalogueEyebrowProps = {
  ne: string;
  en: string;
  /** Catalogue position; localised to Devanagari digits in Nepali. */
  index?: number;
  /** `inverse` sits on the navy fill (capabilities section, footer). */
  variant?: "default" | "inverse";
  className?: string;
};

const toneClassNames: Record<EyebrowTone, string> = {
  accent: "text-accent [--eyebrow-marker:hsl(var(--accent))]",
  primary: "text-primary [--eyebrow-marker:hsl(var(--primary))]",
};

export function Eyebrow(props: Readonly<MarkerEyebrowProps> | Readonly<CatalogueEyebrowProps>) {
  const { i18n } = useTranslation();

  if ("ne" in props && "en" in props) {
    const { ne, en, index, variant = "default", className } = props;
    const isNepali = i18n.language.startsWith("ne");
    const indexLabel =
      index === undefined
        ? null
        : isNepali
          ? toNepaliNumerals(index).padStart(2, "०")
          : String(index).padStart(2, "0");
    return (
      <p
        className={cn(
          "font-eyebrow inline-flex items-baseline gap-2",
          variant === "inverse"
            ? "text-primary-foreground/70 [--eyebrow-tick:hsl(var(--accent-on-dark))]"
            : "text-muted-foreground [--eyebrow-tick:hsl(var(--accent))]",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="h-3 w-0.5 shrink-0 self-center bg-[var(--eyebrow-tick)]"
        />
        {indexLabel !== null && (
          <span className="font-mono tabular-nums">{indexLabel}&nbsp;·</span>
        )}
        <span>{isNepali ? ne : en}</span>
      </p>
    );
  }

  const { children, className, tone = "accent" } = props;
  return (
    <p
      className={cn(
        "font-eyebrow inline-flex items-center gap-2",
        toneClassNames[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 bg-[var(--eyebrow-marker)]"
      />
      {children}
    </p>
  );
}
