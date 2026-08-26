import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { toNepaliNumerals } from "@/utils/bs-calendar";
import { cn } from "@/lib/utils";

interface CapabilityRowProps {
  /** 1-based position; renders as a large serif ०१/०२/०३ (01/02/03 in EN). */
  index: number;
  title: string;
  line: string;
  href: string;
  /** External destinations open in a new tab. */
  external?: boolean;
}

/**
 * One row of the navy capabilities section: numeral · text · arrow, the whole
 * row a single link. Hover lifts the row onto a faint raised panel and nudges
 * the arrow — no icons, no boxes.
 */
export function CapabilityRow({
  index,
  title,
  line,
  href,
  external = false,
}: Readonly<CapabilityRowProps>) {
  const { i18n } = useTranslation();
  const numeral = i18n.language.startsWith("ne")
    ? toNepaliNumerals(index).padStart(2, "०")
    : String(index).padStart(2, "0");

  const className = cn(
    "group -mx-4 grid grid-cols-[auto_1fr_auto] items-baseline gap-4 rounded-xl px-4 py-5 sm:-mx-5 sm:gap-6 sm:px-5",
    "transition-colors duration-200 hover:bg-primary-foreground/5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-primary-surface",
  );

  const content = (
    <>
      <span
        aria-hidden="true"
        className="font-display text-3xl font-medium leading-none text-primary-foreground/40 sm:text-4xl"
      >
        {numeral}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-primary-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-primary-foreground/70">
          {line}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="self-center text-primary-foreground/70 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5 motion-reduce:transition-none"
      >
        →
      </span>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  // Same-page anchors scroll natively; react-router's Link would not.
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  );
}
