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
import { useTranslation } from "react-i18next";


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

        {/* Two columns of single hairline cards, the icon beside the words.
            Four narrow columns turned each paragraph into a tall strip, every
            card stretched to the longest of its row. */}
        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {COMMITMENTS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <li key={titleKey} className="flex gap-5 rounded-[24px] border border-border/70 bg-surface p-6 md:p-7">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xl leading-snug text-primary">{t(titleKey)}</h3>
                <p className="mt-2 max-w-xl text-base leading-7 text-muted-foreground">{t(bodyKey)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
