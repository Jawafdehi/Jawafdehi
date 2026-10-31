import { useTranslation } from "react-i18next";

import { DonorComb } from "@/components/donate/donor-comb";
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
 * "Where your money goes", drawn as a journey rather than a feature grid: the
 * donors themselves → the four cost categories the money covers → the three
 * public outcomes it becomes. The connectors are dashed CSS borders, not SVG,
 * so the board costs nothing to ship and reflows naturally: a horizontal
 * fan-out on desktop, one vertical rail on phones.
 *
 * The cost cards are titles only; their `desc` strings are still in the locale
 * files but deliberately unrendered.
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
      className="bg-background pb-10 pt-12 md:pb-12 md:pt-16"
      aria-labelledby="donate-journey-title"
    >
      <div className="layout-container">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="mb-3">{t("donate.impact.eyebrow")}</Eyebrow>
          {/* A step down from the section h2 scale used elsewhere on the page
              (3xl/4xl). This heading sits above the longest block on /donate,
              and at the larger size it competed with the hero headline rather
              than introducing the stages under it. */}
          <h2
            id="donate-journey-title"
            className="text-2xl font-bold text-foreground md:text-3xl"
          >
            {t("donate.impact.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground/70">
            {t("donate.impact.description")}
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-6xl md:mt-10">
          {/* Stage 1 — the spine: donor → initiative. */}
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            {t("donate.journey.stageGive")}
          </p>
          {/* The donors themselves are the first node. A generic "you" icon sat
              here before; the faces say the same thing and are the part of this
              page that earns another donor, so they lead the journey rather
              than waiting at the bottom of it.

              The org's own node used to sit beside this one, joined by a
              horizontal connector. It is gone: it named the recipient twice
              over — the payment card above already says who receives the money,
              and the closing paragraph below already makes the transparency
              promise — so the stage reads donors → costs with nothing in
              between to restate. */}
          <div className="flex flex-col items-center gap-2">
            <DonorComb />
            <span className="text-sm font-semibold text-primary">
              {t("donate.journey.you")}
            </span>
          </div>

          {/* The drop from the spine into the cost fan-out. */}
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-0 border-l-2 border-dashed border-border"
          />

          {/* Stage 2 — what the money covers. */}
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            {t("donate.journey.stageAllocated")}
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {impactItems.map((item, index) => (
              <li
                key={item.title}
                className="rounded-lg border border-border bg-card p-4"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-xs font-semibold text-accent"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* Title only. Each of these carried a sentence of detail that
                    repeated what the title already said, and four of them was
                    the bulk of this section's height. The copy is still in
                    `donate.impact.items[].desc` if it is ever wanted back. */}
                <h3 className="mt-2 text-base font-bold leading-snug text-foreground">
                  {item.title}
                </h3>
              </li>
            ))}
          </ol>

          {/* The drop from costs into outcomes. */}
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-0 border-l-2 border-dashed border-border"
          />

          {/* Stage 3 — what it becomes. Navy cards so outcomes read as the
              destination of the journey, not four more cost lines. */}
          <p className="mb-3 text-center font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            {t("donate.journey.stageBecomes")}
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {outcomeItems.map((item) => (
              <li
                key={item.title}
                className="rounded-lg bg-primary p-4 text-primary-foreground"
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

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-6 text-foreground/60">
            {t("donate.transparency.description")}
          </p>
        </div>
      </div>
    </section>
  );
}
