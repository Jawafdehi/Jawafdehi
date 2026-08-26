import { useTranslation } from "react-i18next";

import { toNepaliNumerals } from "@/utils/bs-calendar";

interface CapabilityRowProps {
  /** 1-based position; renders as a large serif ०१/०२/०३ (01/02/03 in EN). */
  index: number;
  title: string;
  line: string;
}

/**
 * One row of the navy capabilities section: numeral · text. Deliberately
 * static — these rows explain the archive, they don't navigate it, so no
 * link, no hover state.
 */
export function CapabilityRow({ index, title, line }: Readonly<CapabilityRowProps>) {
  const { i18n } = useTranslation();
  const numeral = i18n.language.startsWith("ne")
    ? toNepaliNumerals(index).padStart(2, "०")
    : String(index).padStart(2, "0");

  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-4 py-5 sm:gap-6">
      <span
        aria-hidden="true"
        className="font-display text-3xl font-medium leading-none text-primary-foreground/40 sm:text-4xl"
      >
        {numeral}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-primary-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-primary-foreground/70">{line}</p>
      </div>
    </div>
  );
}
