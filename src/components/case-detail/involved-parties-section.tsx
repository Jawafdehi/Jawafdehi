import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import { lazyChart } from "@/components/charts/lazy";
import type { CaseEntityCardsProps } from "@/components/case-detail/case-entity-cards";
import { cn } from "@/lib/utils";
import type { JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";
import { getPrimaryName } from "@/utils/entity-helpers";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import type { DecidedAppeal } from "@/utils/appeal-verdict";

// Deferred for the same reason CourtCasesSection is: the case-detail route is
// eager, so a static import would put the flip-card grid in the initial payload
// of every page — including /search, which never renders it. The section sits
// below the fold; the placeholder keeps the tiles' footprint so nothing shifts.
//
// 🛑 `lazyChart`, NOT `lazy()` + `<Suspense>`, and the difference is load-bearing
// now that this route is pre-rendered. React 18's `renderToString` does not
// support Suspense: it emits the fallback wrapped in a FAILED-boundary marker
// preceded by a <template> whose stack carries ABSOLUTE BUILD-MACHINE PATHS, and
// it tells React at hydration to throw the server markup away and re-render.
// Measured on this page before the switch: 3 failed boundaries and 45 instances
// of a local filesystem path, in a file meant to be served to the public.
//
// `lazyChart` is not chart-specific despite the name — DisqusComments uses it
// too. See its own comment for why loading in an effect makes this unreachable
// by construction instead of by remembering to gate a boundary.
const CaseEntityCards = lazyChart<CaseEntityCardsProps>(
  () => import("@/components/case-detail/case-entity-cards").then((m) => m.CaseEntityCards),
  ({ entities }) => <CardsFallback count={entities.length} />,
);

// Parties shown before the "view more" toggle — three rows of the 3-up grid.
// Owned here, not in the lazy chunk, because CardsFallback has to reserve the
// same number of tiles and importing the constant from there would pull the
// chunk back into the initial payload.
const INITIAL_PARTY_LIMIT = 9;

// Same grid, same tile height, same count as the real thing, so the swap when
// the chunk lands is a repaint and not a reflow. Reserving a flat 3 tiles was
// two rows short at `md` and six short on mobile's single column — and 48% of
// relation groups carry more than three parties.
function CardsFallback({ count }: Readonly<{ count: number }>) {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 print:hidden">
      {Array.from({ length: Math.min(count, INITIAL_PARTY_LIMIT) }, (_, i) => (
        <div key={i} className="min-h-[15rem] rounded-2xl bg-muted/50" />
      ))}
    </div>
  );
}

const RELATION_PRIORITY: Record<string, number> = {
  accused: 1,
  alleged: 2,
  victim: 3,
  witness: 4,
  related: 5,
  opposition: 6,
  unknown: 10,
};

interface InvolvedPartiesSectionProps {
  className?: string;
  groupedEntities: Record<string, JawafEntity[]>;
  language: string;
  resolvedEntities: Record<string, Entity>;
  title: string;
  translateRelation: (relationType: string) => string;
  /** Localized court the verdicts are attributed to; null when there is no
   * single first instance to name. */
  forum?: string | null;
  /** The decided appeal for a single-accused case, drawn on that card. */
  personalAppeal?: DecidedAppeal | null;
}

export function InvolvedPartiesSection({
  className,
  groupedEntities,
  language,
  resolvedEntities,
  title,
  translateRelation,
  forum,
  personalAppeal,
}: Readonly<InvolvedPartiesSectionProps>) {
  return (
    <section id="parties-involved" className={cn("mb-12 scroll-mt-28 max-w-4xl", className)}>
      <CaseSectionHeading className="mb-5">{title}</CaseSectionHeading>

      {/* 42.5rem matches the key-allegations content (numeral + 65ch prose),
          so the grid's right edge lines up with the text above it. */}
      <div className="max-w-[42.5rem] space-y-7 text-primary/75">
        {Object.entries(groupedEntities)
          .sort(([typeA], [typeB]) => (RELATION_PRIORITY[typeA] ?? 99) - (RELATION_PRIORITY[typeB] ?? 99))
          .map(([type, entities]) => {
            const normalizedLanguage = language === "ne" ? "ne" : "en";
            const fallbackLanguage = normalizedLanguage === "ne" ? "en" : "ne";
            const names = entities.map((entity) => {
              const resolvedEntity = entity.nes_id ? resolvedEntities[entity.nes_id] : null;
              const name =
                (resolvedEntity
                  ? getPrimaryName(resolvedEntity.names, normalizedLanguage) ||
                    getPrimaryName(resolvedEntity.names, fallbackLanguage)
                  : "") ||
                entity.display_name ||
                entity.nes_id ||
                "Unknown";

              return translateDynamicText(name, language);
            });

            return (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-3 print:hidden">
                <h3 className="whitespace-nowrap text-base font-semibold  text-accent/90">
                  {translateRelation(type)}
                </h3>

              </div>
              <CaseEntityCards
                className="print:hidden"
                entities={entities}
                resolvedEntities={resolvedEntities}
                language={language}
                initialLimit={INITIAL_PARTY_LIMIT}
                forum={forum}
                appeal={type === "accused" ? personalAppeal : null}
              />
              <p className="hidden print:block">
                <strong>{translateRelation(type)}:</strong> {names.join(", ")}
              </p>
            </div>
            );
          })}
      </div>
    </section>
  );
}
