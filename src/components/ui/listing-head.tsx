import { ArrowRight } from "@/components/icons";
import { Link } from "react-router-dom";

import { Reveal } from "@/components/ui/reveal";

/**
 * A listing section's heading with its "see all" link on the right, as the
 * home page's Recent blogs and the product pages' updates use it.
 */
export function ListingHead({ heading, to, linkLabel }: Readonly<{ heading: string; to: string; linkLabel: string }>) {
  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h2 className="font-home-section-title text-primary">{heading}</h2>
        <Link
          to={to}
          className="group inline-flex items-center gap-1.5 rounded text-base font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </Reveal>
  );
}
