import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSourceTypeMetadata, humanizeSourceType, type SourceTypeTone } from "@/utils/source-type-meta";

interface SourceTypeBadgeProps {
  className?: string;
  label?: string | null;
  sourceType?: string | null;
}

// Categorical tones, not severity: a source being "allegation" is not an error
// state. Hues come from --tone-* in src/index.css; fills and borders are
// opacity steps off the same token so a tone is retheming in one place.
// When dark mode lands, define lighter --tone-* values under `.dark` rather
// than reintroducing per-badge dark: variants here.
const SOURCE_TYPE_TONE_CLASSES: Record<SourceTypeTone, string> = {
  allegation: "border-tone-red/25 bg-tone-red/10 text-tone-red",
  financial: "border-tone-cyan/25 bg-tone-cyan/10 text-tone-cyan",
  government: "border-tone-blue/25 bg-tone-blue/10 text-tone-blue",
  investigative: "border-tone-emerald/25 bg-tone-emerald/10 text-tone-emerald",
  legal: "border-border bg-muted text-foreground",
  media: "border-tone-amber/25 bg-tone-amber/10 text-tone-amber",
  neutral: "border-border bg-muted text-muted-foreground",
  policy: "border-tone-indigo/25 bg-tone-indigo/10 text-tone-indigo",
  public: "border-tone-orange/25 bg-tone-orange/10 text-tone-orange",
  social: "border-tone-pink/25 bg-tone-pink/10 text-tone-pink",
};

export function SourceTypeBadge({
  className,
  label,
  sourceType,
}: Readonly<SourceTypeBadgeProps>) {
  const { t } = useTranslation();

  if (!sourceType && !label) return null;

  const metadata = getSourceTypeMetadata(sourceType);
  const displayLabel = label ?? (sourceType
    ? t(metadata.labelKey ?? `sourceType.${sourceType}`, { defaultValue: humanizeSourceType(sourceType) })
    : "");

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-meta font-meta-compact h-6 rounded-full px-2.5 shadow-sm ring-1 ring-inset ring-white/45",
        SOURCE_TYPE_TONE_CLASSES[metadata.tone],
        className,
      )}
    >
      {displayLabel}
    </Badge>
  );
}
