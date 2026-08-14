import {
  Archive,
  CheckCircle2,
  GitBranch,
  Globe,
  Infinity as InfinityIcon,
  Scale,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type CommitmentItem = {
  icon: LucideIcon;
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
  return (
    <section id="commitments" className="py-12 md:py-16">
      <div className="layout-container">
        <h2 className="mb-10 text-center text-3xl font-extrabold tracking-normal text-primary md:text-4xl">
          {t("commitment.title")}
        </h2>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6">
          {COMMITMENTS.map(({ icon: Icon, titleKey, bodyKey }, index) => (
            <div
              key={titleKey}
              className={[
                "flex flex-col items-center text-center lg:col-span-2",
                index === 6 ? "lg:col-start-2" : "",
                index === 7 ? "lg:col-start-4" : "",
              ].join(" ")}
            >
              <div>
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Icon className="h-5 w-5 flex-shrink-0 text-accent" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-foreground">{t(titleKey)}</h3>
                </div>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {t(bodyKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
