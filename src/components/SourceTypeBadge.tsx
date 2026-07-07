import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSourceTypeMetadata, humanizeSourceType, type SourceTypeTone } from "@/utils/source-type-meta";

interface SourceTypeBadgeProps {
  className?: string;
  label?: string | null;
  sourceType?: string | null;
}

const SOURCE_TYPE_TONE_CLASSES: Record<SourceTypeTone, string> = {
  allegation:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  financial:
    "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200",
  government:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
  investigative:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  legal:
    "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
  media:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  neutral:
    "border-border bg-muted text-muted-foreground",
  policy:
    "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200",
  public:
    "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200",
  social:
    "border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-900/60 dark:bg-pink-950/40 dark:text-pink-200",
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
        "h-6 rounded-full px-2.5 text-[11px] font-semibold leading-none shadow-sm ring-1 ring-inset ring-white/45",
        SOURCE_TYPE_TONE_CLASSES[metadata.tone],
        className,
      )}
    >
      {displayLabel}
    </Badge>
  );
}
