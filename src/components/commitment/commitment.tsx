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

import { Panel } from "@/components/ui/panel";

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

        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMMITMENTS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <li key={titleKey}>
              <Panel>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-normal leading-snug text-primary">{t(titleKey)}</h3>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{t(bodyKey)}</p>
              </Panel>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
