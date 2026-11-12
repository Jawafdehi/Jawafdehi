import { useTranslation } from "react-i18next";
import { Cta } from "@/components/home/cta";
import { Seo } from "@/components/Seo";
import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { ArrowLink } from "@/components/ui/arrow-link";
import { LightHero } from "@/components/ui/light-hero";
import { Panel } from "@/components/ui/panel";
import {
  BriefcaseBusiness,
  GraduationCap,
  Laptop,
  Mail,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { SITE_URL } from "@/utils/seo";

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
  const profiles = getProfiles();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title="Volunteer with Us — Jawafdehi"
        description="Join Jawafdehi as a volunteer. Help build Nepal's permanent corruption case archive — as a researcher, engineer, journalist, or translator."
        canonicalUrl={`${SITE_URL}/volunteer/`}
      />

      <main id="main-content" className="flex-1">
        <LightHero
          id="volunteer-hero"
          eyebrow={t("volunteer.hero.eyebrow")}
          title={
            <>
              {t("volunteer.hero.helpBuild")}{" "}
              <span className="text-accent">{t("volunteer.hero.permanentAccountability")}</span>{" "}
              {t("volunteer.hero.record")}
            </>
          }
          description={t("volunteer.hero.description")}
          actions={
            <>
              <ArrowLink href="https://github.com/Jawafdehi">
                {t("volunteer.hero.github")}
              </ArrowLink>
              <a
                href="mailto:report@jawafdehi.org"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-muted px-5 text-[15px] text-primary transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t("volunteer.hero.email")}
              </a>
            </>
          }
        />

        {/* Who we're looking for: four grey panels, the icon in a white disc. */}
        <section id="who-we-need" aria-labelledby="who-we-need-title" className="pt-8 md:pt-12">
          <div className="layout-container">
            <h2 id="who-we-need-title" className="font-home-section-title text-primary">
              {t("volunteer.whoCanJoin.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{t("volunteer.whoCanJoin.description")}</p>
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {profiles.map(({ icon: Icon, titleKey, descKey }) => (
                <li key={titleKey}>
                  <Panel className="min-h-[14rem]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary">
                      <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                    <h3 className="mt-auto pt-8 text-xl font-normal leading-snug text-primary">{t(titleKey)}</h3>
                    <p className="mt-2 text-[15px] leading-6 text-muted-foreground">{t(descKey)}</p>
                  </Panel>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The global community, as one navy band. */}
        <section aria-labelledby="global-community-title" className="pt-16 md:pt-24">
          <div className="layout-container">
            <div className="relative isolate overflow-hidden rounded-[28px] bg-primary-surface px-6 py-12 md:px-12 md:py-16">
              <div aria-hidden="true" className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_left,#000_20%,transparent_75%)]">
                <ShaderBackdrop design="lines" />
              </div>
              <p className="font-eyebrow text-sm text-[hsl(var(--accent-on-dark))]">{t("volunteer.globalCommunity.eyebrow")}</p>
              <h2
                id="global-community-title"
                className="font-home-display mt-4 max-w-2xl text-3xl leading-tight text-primary-foreground md:text-4xl"
              >
                {t("volunteer.globalCommunity.title")}
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-primary-foreground/75">
                {t("volunteer.globalCommunity.description")}
              </p>
            </div>
          </div>
        </section>

        <Cta />
      </main>
    </div>
  );
};

export default Volunteer;
