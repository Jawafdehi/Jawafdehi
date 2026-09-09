import { Landmark, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Eyebrow } from "@/components/ui/eyebrow";

type ImpactItem = { title: string; desc: string };

const isImpactItem = (item: unknown): item is ImpactItem =>
  typeof item === "object" &&
  item !== null &&
  "title" in item &&
  "desc" in item &&
  typeof item.title === "string" &&
  typeof item.desc === "string";

/**
 * "Where your money goes", drawn as a journey rather than a feature grid:
 * donor → Jawafdehi Initiative → the four cost categories the money covers →
 * the three public outcomes it becomes. The connectors are dashed CSS borders,
 * not SVG, so the board costs nothing to ship and reflows naturally: a
 * horizontal fan-out on desktop, one vertical rail on phones.
 *
 * Deliberately qualitative — no percentage split is claimed anywhere, because
 * none has been published. If a real allocation breakdown lands later it can
 * be added per-card without restructuring. The outcomes row states only what
 * the site verifiably does: publishes sourced cases, keeps the archive online,
 * and keeps it free.
 */
export function DonationJourney() {
  const { t } = useTranslation();
  const rawImpactItems = t("donate.impact.items", { returnObjects: true });
  const impactItems = Array.isArray(rawImpactItems)
    ? rawImpactItems.filter(isImpactItem)
    : [];
  const rawOutcomeItems = t("donate.outcomes.items", { returnObjects: true });
  const outcomeItems = Array.isArray(rawOutcomeItems)
    ? rawOutcomeItems.filter(isImpactItem)
    : [];

  return (
    <section
      id="donate-journey"
      className="bg-background py-16 md:py-20"
      aria-labelledby="donate-journey-title"
    >
      <div className="layout-container">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="mb-3">{t("donate.impact.eyebrow")}</Eyebrow>
          <h2
            id="donate-journey-title"
            className="text-3xl font-bold text-foreground md:text-4xl"
          >
            {t("donate.impact.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground/70">
            {t("donate.impact.description")}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-6xl md:mt-14">
          {/* Stage 1 — the spine: donor → initiative. */}
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            {t("donate.journey.stageGive")}
          </p>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary">
              <User className="h-4 w-4 text-accent" aria-hidden="true" />
              {t("donate.journey.you")}
            </span>
            <span
              aria-hidden="true"
              className="h-8 border-l-2 border-dashed border-border sm:h-auto sm:w-16 sm:border-l-0 sm:border-t-2"
            />
            <span className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-border bg-card px-5 py-2.5 text-center sm:items-start">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <Landmark className="h-4 w-4 text-accent" aria-hidden="true" />
                {t("donate.ways.nepali.accountName")}
              </span>
              <span className="text-xs font-medium text-foreground/60">
                {t("donate.transparency.title")}
              </span>
            </span>
          </div>

          {/* The drop from the spine into the cost fan-out. */}
          <div
            aria-hidden="true"
            className="mx-auto h-10 w-0 border-l-2 border-dashed border-border"
          />

          {/* Stage 2 — what the money covers. */}
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            {t("donate.journey.stageAllocated")}
          </p>
          <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {impactItems.map((item, index) => (
              <li
                key={item.title}
                className="rounded-lg border border-border bg-card p-5"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-xs font-semibold text-accent"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-base font-bold leading-snug text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-foreground/70">
                  {item.desc}
                </p>
              </li>
            ))}
          </ol>

          {/* The drop from costs into outcomes. */}
          <div
            aria-hidden="true"
            className="mx-auto h-10 w-0 border-l-2 border-dashed border-border"
          />

          {/* Stage 3 — what it becomes. Navy cards so outcomes read as the
              destination of the journey, not four more cost lines. */}
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            {t("donate.journey.stageBecomes")}
          </p>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {outcomeItems.map((item) => (
              <li
                key={item.title}
                className="rounded-lg bg-primary p-5 text-primary-foreground"
              >
                <h3 className="text-base font-bold leading-snug">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-primary-foreground/75">
                  {item.desc}
                </p>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-foreground/60">
            {t("donate.transparency.description")}
          </p>
        </div>
      </div>
    </section>
  );
}
