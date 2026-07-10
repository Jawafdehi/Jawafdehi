import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Cta } from "@/components/home/cta";
import { VolunteerHero } from "@/components/volunteer/hero";
import {
  BookOpen,
  BriefcaseBusiness,
  FlaskConical,
  Globe,
  GraduationCap,
  Laptop,
  Megaphone,
  Scale,
  Search,
  type LucideIcon,
} from "lucide-react";

type TeamEntry = {
  icon: LucideIcon;
  nameKey: string;
  responsibilityKeys: string[];
};

const teamConfigs: Array<{ icon: LucideIcon; nameKey: string; respKey: string }> = [
  { icon: Search, nameKey: "volunteer.teams.dataScraping", respKey: "volunteer.teams.dataScrapingResponsibilities" },
  { icon: Megaphone, nameKey: "volunteer.teams.outreach", respKey: "volunteer.teams.outreachResponsibilities" },
  { icon: Globe, nameKey: "volunteer.teams.platformDevelopment", respKey: "volunteer.teams.platformDevelopmentResponsibilities" },
  { icon: BookOpen, nameKey: "volunteer.teams.corruptionCompilation", respKey: "volunteer.teams.corruptionCompilationResponsibilities" },
  { icon: FlaskConical, nameKey: "volunteer.teams.corruptionResearch", respKey: "volunteer.teams.corruptionResearchResponsibilities" },
];

type VolunteerProfile = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
};

const getProfiles = (): VolunteerProfile[] => [
  {
    icon: Laptop,
    titleKey: "volunteer.profiles.technologyEnthusiasts.title",
    descKey: "volunteer.profiles.technologyEnthusiasts.desc",
  },
  {
    icon: BriefcaseBusiness,
    titleKey: "volunteer.profiles.workingProfessionals.title",
    descKey: "volunteer.profiles.workingProfessionals.desc",
  },
  {
    icon: Scale,
    titleKey: "volunteer.profiles.legalProfessionals.title",
    descKey: "volunteer.profiles.legalProfessionals.desc",
  },
  {
    icon: GraduationCap,
    titleKey: "volunteer.profiles.students.title",
    descKey: "volunteer.profiles.students.desc",
  },
];

const Volunteer = () => {
  const { t } = useTranslation();
  const teams: TeamEntry[] = teamConfigs.map((cfg) => ({
    icon: cfg.icon,
    nameKey: cfg.nameKey,
    responsibilityKeys: t(cfg.respKey, { returnObjects: true }) as string[],
  }));
  const profiles = getProfiles();
  return (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet>
      <title>Volunteer with Us — Jawafdehi</title>
      <meta name="description" content="Join Jawafdehi as a volunteer. Help build Nepal's permanent corruption case archive — as a researcher, engineer, journalist, or translator." />
      <link rel="canonical" href="https://jawafdehi.org/volunteer" />
      <meta property="og:site_name" content="Jawafdehi Nepal" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://jawafdehi.org/volunteer" />
      <meta property="og:title" content="Volunteer with Us — Jawafdehi" />
      <meta property="og:description" content="Join Jawafdehi as a volunteer. Help build Nepal's permanent corruption case archive — as a researcher, engineer, journalist, or translator." />
      <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Volunteer with Us — Jawafdehi" />
      <meta name="twitter:description" content="Join Jawafdehi as a volunteer. Help build Nepal's permanent corruption case archive — as a researcher, engineer, journalist, or translator." />
      <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
    </Helmet>

    <main id="main-content" className="flex-1">
      <VolunteerHero />

      {/* Who we're looking for */}
      <section id="who-we-need" className="bg-muted/10 pt-12 pb-10 md:pt-14 md:pb-12 lg:pt-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {t("volunteer.whoCanJoin.eyebrow")}
            </p>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              {t("volunteer.whoCanJoin.title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-foreground/70">
              {t("volunteer.whoCanJoin.description")}
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-4 lg:gap-10">
            {profiles.map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="mx-auto flex max-w-[16rem] flex-col items-center text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.07] text-primary">
                  <Icon aria-hidden="true" className="h-10 w-10" strokeWidth={1.45} />
                </div>
                <h3 className="mb-2 text-lg font-bold leading-tight text-foreground">{t(titleKey)}</h3>
                <p className="text-sm leading-6 text-foreground/70">{t(descKey)}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {t("volunteer.globalCommunity.eyebrow")}
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-normal text-foreground md:text-3xl">
              {t("volunteer.globalCommunity.title")}
            </h2>
            <p className="text-base leading-8 text-foreground/75 md:text-[1.0625rem]">
              {t("volunteer.globalCommunity.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Teams */}
      <section id="volunteer-teams" className="bg-muted/20 pt-10 pb-12 md:pt-12 md:pb-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {t("volunteer.teams.eyebrow")}
            </p>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              {t("volunteer.teams.title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-foreground/70">
              {t("volunteer.teams.description")}
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map(({ icon: Icon, nameKey, responsibilityKeys }) => (
              <div key={nameKey} className="rounded-lg border border-primary/10 bg-background/70 p-6 shadow-sm shadow-primary/5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.07] text-primary">
                    <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.55} />
                  </div>
                  <h3 className="text-lg font-bold leading-tight text-foreground">{t(nameKey)}</h3>
                </div>
                <ul className="space-y-3">
                  {responsibilityKeys.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-foreground/70">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Cta />
    </main>

  </div>
  );
};

export default Volunteer;
