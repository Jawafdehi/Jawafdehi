import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Landmark,
  Database,
  GitMerge,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

/**
 * "Where this comes from." A plain, conceptual flow diagram answering the
 * question readers keep asking — how does a public record become a case on this
 * site? Four stages, left-to-right on desktop and top-to-bottom on mobile, with
 * no numbers: this replaces the old prose methodology so the same ground isn't
 * covered twice. The detailed, per-case methodology lives behind the process
 * link below.
 */
const STAGES = [
  { key: "sources", Icon: Landmark },
  { key: "collected", Icon: Database },
  { key: "linked", Icon: GitMerge },
  { key: "cases", Icon: ShieldCheck },
] as const;

export function DataPipeline() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {t("dataQuality.methodology.heading", "Where this comes from")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          "dataQuality.pipeline.intro",
          "Every figure on this page follows the same path — from public record to published case.",
        )}
      </p>

      <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-stretch">
        {STAGES.map(({ key, Icon }, i) => (
          <Fragment key={key}>
            <div className="flex-1 rounded-xl border border-border bg-muted/20 p-5">
              <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-foreground">
                {t(`dataQuality.pipeline.stages.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t(`dataQuality.pipeline.stages.${key}.caption`)}
              </p>
            </div>
            {i < STAGES.length - 1 && (
              <div
                className="flex shrink-0 items-center justify-center py-1 md:py-0"
                aria-hidden="true"
              >
                <ChevronRight className="h-5 w-5 rotate-90 text-muted-foreground/50 md:rotate-0" />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      <p className="mt-6">
        <Link
          to="/our-process"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          {t("dataQuality.methodology.processLink", "Read how we research and verify each case")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
