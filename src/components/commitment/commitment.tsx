import {
  Archive,
  CheckCircle2,
  GitBranch,
  Globe,
  InfinityIcon,
  Scale,
  Sparkles,
  Users,
  type IconComponent,
} from "@/components/icons";
import { useRef, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";


const DOT_TINTS = ["hsl(var(--accent))", "hsl(214 65% 52%)"] as const;

/**
 * One commitment: a hairline card with a still dot-dither bloom in its corner,
 * and a spotlight of the same dots that follows the pointer. CSS only — a dot
 * grid under a radial mask whose centre is two custom properties — so eight
 * cards cost no WebGL. The pointer position is written straight onto the
 * element's style (no React state, no re-render per mousemove). Touch and
 * reduced motion get the still bloom alone.
 */
function CommitmentCard({
  index,
  icon: Icon,
  title,
  body,
}: Readonly<{ index: number; icon: IconComponent; title: string; body: string }>) {
  const ref = useRef<HTMLLIElement>(null);
  const tint = DOT_TINTS[index % DOT_TINTS.length];
  const dots = {
    backgroundImage: `radial-gradient(${tint} 1.4px, transparent 1.9px), radial-gradient(${tint} 1.4px, transparent 1.9px)`,
    backgroundSize: "8px 8px, 8px 8px",
    backgroundPosition: "0 0, 4px 4px",
  } as const;
  // The still bloom lives in the bottom-right corner, where the words (which
  // start top-left) never reach, so it never sits under a line of text.
  const bloom = "radial-gradient(220px circle at 100% 100%, #000 0%, rgba(0,0,0,0.3) 45%, transparent 100%)";
  const spot = "radial-gradient(140px circle at var(--x, -200px) var(--y, -200px), rgba(0,0,0,0.45), transparent 70%)";

  const onPointerMove = (event: PointerEvent<HTMLLIElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--y", `${event.clientY - rect.top}px`);
  };

  return (
    <li
      ref={ref}
      onPointerMove={onPointerMove}
      className="group relative isolate flex gap-5 overflow-hidden rounded-[24px] border border-border/70 bg-surface p-6 transition-[border-color] duration-200 ease-out hover:border-primary/20 md:p-7"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70" style={{ ...dots, maskImage: bloom, WebkitMaskImage: bloom }} />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:hidden"
        style={{ ...dots, maskImage: spot, WebkitMaskImage: spot }}
      />
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-xl leading-snug text-primary">{title}</h3>
        <p className="mt-2 max-w-xl text-base leading-7 text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

type CommitmentItem = {
  icon: IconComponent;
  titleKey: string;
  bodyKey: string;
};

const COMMITMENTS: CommitmentItem[] = [
  {
    icon: Archive,
    titleKey: "commitment.items.permanentRecord.title",
    bodyKey: "commitment.items.permanentRecord.body",
  },
  {
    icon: Scale,
    titleKey: "commitment.items.factsNotOpinions.title",
    bodyKey: "commitment.items.factsNotOpinions.body",
  },
  {
    icon: CheckCircle2,
    titleKey: "commitment.items.humanReview.title",
    bodyKey: "commitment.items.humanReview.body",
  },
  {
    icon: Globe,
    titleKey: "commitment.items.publicDomain.title",
    bodyKey: "commitment.items.publicDomain.body",
  },
  {
    icon: GitBranch,
    titleKey: "commitment.items.openSource.title",
    bodyKey: "commitment.items.openSource.body",
  },
  {
    icon: InfinityIcon,
    titleKey: "commitment.items.freeForever.title",
    bodyKey: "commitment.items.freeForever.body",
  },
  {
    icon: Users,
    titleKey: "commitment.items.volunteerPowered.title",
    bodyKey: "commitment.items.volunteerPowered.body",
  },
  {
    icon: Sparkles,
    titleKey: "commitment.items.techForCitizens.title",
    bodyKey: "commitment.items.techForCitizens.body",
  },
];

export function CommitmentList() {
  const { t } = useTranslation();
  // Eight promises as the redesign's grey panels, four across.
  return (
    <section id="commitments" aria-labelledby="commitments-title" className="pb-20 pt-16 md:pb-28 md:pt-24">
      <div className="layout-container">
        <h2 id="commitments-title" className="font-home-section-title text-primary">
          {t("commitment.title")}
        </h2>

        {/* Two columns of hairline cards, each with the site's dot dither in
            its corner (crimson and blue by turn); under a pointer a soft disc of
            the same dots follows the cursor across the card. */}
        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {COMMITMENTS.map(({ icon: Icon, titleKey, bodyKey }, index) => (
            <CommitmentCard key={titleKey} index={index} icon={Icon} title={t(titleKey)} body={t(bodyKey)} />
          ))}
        </ul>
      </div>
    </section>
  );
}
