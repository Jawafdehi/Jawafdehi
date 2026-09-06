// Grid of the parties bound to a case: photo (or kind glyph) + name at rest,
// and the relationship details (verdict, charge notes) revealed by a card flip
// on hover, focus or tap — the front face rotates away, the details rotate in.
//
// Data available per card (verified against /api/cases/<slug>/ and
// /api/entities/<iri>): the case bind carries display_name, the relation
// type, an outcome (only decided ones render — `charged` is the undecided
// default) and an HTML `notes` blob with the charge text; the resolved entity
// record adds en/ne names and, rarely, a picture. Most parties have no photo,
// so the fallback glyph is the common case, not an edge case.
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, ChevronDown, MapPin, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import type { JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";
import { getPrimaryName } from "@/utils/entity-helpers";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { cn } from "@/lib/utils";
import { entityPath } from "@/lib/entity-links";
import { outcomeBadgeClass, outcomeLabel, shouldShowOutcome } from "@/utils/case-outcome";

interface CaseEntityCardsProps {
  className?: string;
  entities: JawafEntity[];
  resolvedEntities: Record<string, Entity>;
  language: string;
  /** Cards shown before the "view more" toggle. Three rows of the 3-up grid. */
  initialLimit?: number;
}

function getNames(jawafEntity: JawafEntity, entity: Entity | null, language: string) {
  const lang = language === "ne" ? "ne" : "en";
  const otherLang = lang === "ne" ? "en" : "ne";
  const primary =
    (entity ? getPrimaryName(entity.names, lang) || getPrimaryName(entity.names, otherLang) : "") ||
    jawafEntity.display_name ||
    jawafEntity.nes_id ||
    "Unknown";
  // The other-language spelling, when the record has one and it differs.
  const alternate = entity ? getPrimaryName(entity.names, otherLang) : null;
  return {
    primary: translateDynamicText(primary, language),
    alternate: alternate && alternate !== primary ? alternate : null,
  };
}

// Thumbnail when there is one, else the full image, else whatever came first.
function getEntityImage(entity: Entity | null) {
  if (!entity?.pictures?.length) return null;
  return (
    entity.pictures.find((picture) => picture.type === "thumb")?.url ||
    entity.pictures.find((picture) => picture.type === "full")?.url ||
    entity.pictures[0]?.url ||
    null
  );
}

function stripNotes(notes: string | undefined, language: string) {
  if (!notes) return "";
  const text = notes
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // A lone dash/dot placeholder is not a note.
  if (!/[\p{L}\p{N}]/u.test(text)) return "";
  return translateDynamicText(text, language);
}

// The bind's `entity_type` is a schema.org type ("Person", "Organization",
// "GovernmentOrganization", "Place", "AdministrativeArea,jawafdehi:District",
// "Courthouse"...) and is the curated value, so it wins; the resolved record's
// lowercase `type` is derived from the IRI path and can lag it (an organization
// filed under /entity/person/ still says "person" there).
function entityKind(jawafEntity: JawafEntity, entity: Entity | null): "person" | "organization" | "location" {
  const kind = (jawafEntity.entity_type || entity?.type || "").toLowerCase();
  if (/administrativearea|place|location/.test(kind)) return "location";
  if (/organi[sz]ation|corporation|ngo|politicalparty|judicialbody|courthouse|educational|hospital|civicstructure/.test(kind)) {
    return "organization";
  }
  return "person";
}

function FallbackGlyph({ kind, className }: { kind: string; className?: string }) {
  if (kind === "location") return <MapPin className={className} />;
  if (kind === "organization") return <Building2 className={className} />;
  return <User className={className} />;
}

// Strong ease-out — the built-in curves are too weak to read as intentional.
// Fast start means the card responds the instant the pointer lands; the soft
// landing is where the "turn" is read. (An ease-in-out was tried and hesitated
// for the first ~100ms, which reads as lag on a hover.)
const EASE_OUT = "[transition-timing-function:cubic-bezier(0.23,1,0.32,1)]";

const SURFACE = "bg-muted/50 transition-colors duration-200 group-hover:bg-muted/70";

// Flip: the back face is pre-rotated and both faces hide their backface; the
// inner wrapper rotates on hover / focus-within / tap (data-flipped).
const FLIP_INNER =
  "[transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-within:[transform:rotateY(180deg)] group-data-[flipped=true]:[transform:rotateY(180deg)]";
const FLIP_FRONT = "[backface-visibility:hidden]";
const FLIP_BACK = "[backface-visibility:hidden] [transform:rotateY(180deg)]";

// Details content rises 6px + fades in once the face has arrived, so the
// reveal reads as two beats (face, then words) instead of one hard swap.
const SETTLE = `translate-y-1.5 opacity-0 transition-[transform,opacity] duration-300 ${EASE_OUT} group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-data-[flipped=true]:translate-y-0 group-data-[flipped=true]:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-opacity`;

interface EntityCardProps {
  jawafEntity: JawafEntity;
  entity: Entity | null;
  language: string;
}

function EntityCard({ jawafEntity, entity, language }: Readonly<EntityCardProps>) {
  // The front face is a button: on touch (no hover) a tap flips the card and
  // the details face — itself the profile link — is what the second tap lands
  // on; with a keyboard, Enter/Space does the same. On pointer devices hover
  // flips the card before the button can be pressed (a turned-away backface is
  // not hit-testable), so nothing fights.
  const [flipped, setFlipped] = useState(false);
  // Pointer hover, tracked so the turned-away front can be hidden from
  // assistive tech. Focus deliberately does NOT hide it: the focused element
  // is the front button itself.
  const [hovered, setHovered] = useState(false);
  // A broken picture URL falls back to the kind glyph.
  const [imageFailed, setImageFailed] = useState(false);

  // A scrolled details face must come back to the top the next time it is
  // revealed. Reset after the card has finished turning away (the face is
  // still visible mid-flip, so an immediate reset would visibly jump).
  const scrollRef = useRef<HTMLDivElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  const scheduleScrollReset = () => {
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      scrollRef.current?.scrollTo({ top: 0 });
    }, 550);
  };
  const cancelScrollReset = () => clearTimeout(resetTimer.current);
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  const onMouseEnter = () => {
    cancelScrollReset();
    setHovered(true);
  };
  const onMouseLeave = () => {
    scheduleScrollReset();
    setHovered(false);
  };
  // Focus leaving the card entirely puts a keyboard/tap-flipped card back.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    scheduleScrollReset();
    setFlipped(false);
  };

  const names = getNames(jawafEntity, entity, language);
  const imageUrl = imageFailed ? null : getEntityImage(entity);
  const kind = entityKind(jawafEntity, entity);
  const notes = stripNotes(jawafEntity.notes, language);
  const href = entityPath(jawafEntity.nes_id);
  const showOutcome = jawafEntity.type === "accused" && shouldShowOutcome(jawafEntity.outcome);

  const toggleFlipped = () =>
    setFlipped((v) => {
      if (v) scheduleScrollReset();
      return !v;
    });

  // Front: photo (or glyph) + name only.
  const frontContent = (
    <>
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border/70 bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            width={96}
            height={96}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className={cn("h-full w-full", kind === "person" ? "object-cover" : "object-contain bg-white p-3")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <FallbackGlyph kind={kind} aria-hidden="true" className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <span className="block text-balance break-words text-base font-medium leading-snug text-primary">
          {names.primary}
        </span>
        {names.alternate && (
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">{names.alternate}</span>
        )}
      </div>
    </>
  );
  const frontClass = cn(
    "relative flex h-full min-h-[15rem] w-full flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center",
    SURFACE,
  );

  // Nothing to reveal (no notes, no decided verdict) → the card stays put and
  // the front itself links to the profile.
  if (!notes && !showOutcome) {
    const staticClass = cn(
      "group relative block h-full touch-manipulation rounded-2xl transition-transform duration-200 [-webkit-tap-highlight-color:transparent]",
      EASE_OUT,
      href &&
        "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:hover:translate-y-0",
    );
    return href ? (
      <Link to={href} className={staticClass}>
        <div className={frontClass}>{frontContent}</div>
      </Link>
    ) : (
      <div className={staticClass}>
        <div className={frontClass}>{frontContent}</div>
      </div>
    );
  }

  const details = (
    <>
      <span className="sr-only">{names.primary}</span>
      {/* One block — badge directly above the text — centred while it fits;
          `my-auto` collapses to 0 once it overflows so the top stays reachable. */}
      <div
        ref={scrollRef}
        className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 [scrollbar-width:thin]", SETTLE, "delay-150")}
      >
        <div className="my-auto flex flex-col gap-3">
          {showOutcome && (
            <Badge variant="outline" className={cn("self-start text-sm", outcomeBadgeClass(jawafEntity.outcome))}>
              {outcomeLabel(jawafEntity.outcome, language)}
            </Badge>
          )}
          {notes && <p className="font-paragraph font-paragraph-compact text-primary/85">{notes}</p>}
        </div>
      </div>
    </>
  );

  const backClass = cn(
    "absolute inset-0 flex flex-col gap-3 rounded-2xl p-4 text-left",
    href && "cursor-pointer focus-visible:outline-none",
    SURFACE,
    FLIP_BACK,
  );

  // The whole details face links to the profile (no separate button).
  const back: ReactNode = href ? (
    <Link to={href} className={backClass}>
      {details}
    </Link>
  ) : (
    <div className={backClass}>{details}</div>
  );

  return (
    // The card is as tall as its front (min 15rem); the grid row stretches every
    // card to the tallest one, and the details face fills that and scrolls inside.
    <div
      className={cn(
        "group relative h-full touch-manipulation rounded-2xl transition-transform duration-200 [-webkit-tap-highlight-color:transparent] [perspective:1200px]",
        EASE_OUT,
        "hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background motion-reduce:hover:translate-y-0",
      )}
      data-flipped={flipped}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={cancelScrollReset}
      onBlur={onBlur}
    >
      <div
        className={cn(
          // Asymmetric: 500ms in (the reveal is the moment worth watching),
          // 300ms back — exits should always be quicker than entries. The 75ms
          // hover-intent delay keeps a pointer sweeping across the grid from
          // flipping every card it crosses; leaving is immediate.
          "relative h-full w-full transition-transform duration-300 group-hover:delay-75 group-hover:duration-500 group-focus-within:duration-500 group-data-[flipped=true]:duration-500 motion-reduce:transition-none",
          EASE_OUT,
          FLIP_INNER,
        )}
      >
        {/* Hidden from AT only while the pointer holds it turned away; after a
            keyboard/tap toggle it stays exposed as an expanded disclosure. */}
        <button
          type="button"
          aria-expanded={hovered || flipped}
          aria-hidden={hovered}
          tabIndex={hovered ? -1 : 0}
          onClick={toggleFlipped}
          className={cn(frontClass, FLIP_FRONT, "focus-visible:outline-none")}
        >
          {frontContent}
        </button>
        {back}
      </div>
    </div>
  );
}

export function CaseEntityCards({
  className,
  entities,
  resolvedEntities,
  language,
  initialLimit = 9,
}: Readonly<CaseEntityCardsProps>) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (entities.length === 0) return null;

  const displayed = isExpanded ? entities : entities.slice(0, initialLimit);
  const remaining = entities.length - initialLimit;
  const hasMore = remaining > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {displayed.map((jawafEntity, index) => {
          const entity = jawafEntity.nes_id ? resolvedEntities[jawafEntity.nes_id] ?? null : null;
          // Binds are keyed on the NES IRI; id-less binds fall back to name+index.
          const key = jawafEntity.nes_id ?? `${jawafEntity.display_name ?? "entity"}-${index}`;
          return (
            <Reveal key={key} delayMs={(index % 3) * 60}>
              <EntityCard jawafEntity={jawafEntity} entity={entity} language={language} />
            </Reveal>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center sm:justify-start">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary",
              "transition-[transform,background-color,border-color] duration-150 hover:border-primary/30 hover:bg-muted/60 active:scale-[0.97]",
              EASE_OUT,
            )}
          >
            {isExpanded
              ? t("caseDetail.showLessParties")
              : t("caseDetail.showMoreParties", { count: remaining })}
            <ChevronDown
              aria-hidden="true"
              className={cn("h-4 w-4 transition-transform duration-200", EASE_OUT, isExpanded && "rotate-180")}
            />
          </button>
        </div>
      )}
    </div>
  );
}
