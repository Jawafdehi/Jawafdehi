import { useTranslation } from "react-i18next";
import { CoreValues } from "@/components/about/core-values";
import { AboutHero } from "@/components/about/hero";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Seo } from "@/components/Seo";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`About | ${SITE_NAME}`}
        description="Meet the team behind Jawafdehi — Nepal's Permanent Corruption Case Archive — and the principles behind how we document and verify corruption cases."
        canonicalUrl={`${SITE_URL}/about/`}
      />

      <div className="flex-1">
        <AboutHero />

        {/* About Us Section */}
        <section id="about-us" className="pb-16 md:pb-24">
          <div className="layout-container">
            <div className="grid gap-12 md:grid-cols-2 lg:gap-16">
              <div>
                <Eyebrow className="mb-4">
                  {t("about.aboutUs.eyebrow", "Who we are")}
                </Eyebrow>
                <h2 className="font-home-display mb-5 text-3xl text-primary md:text-4xl">{t("about.aboutUs.title")}</h2>
                <p className="text-lg leading-8 text-muted-foreground">
                  {t("about.aboutUs.description").split(t("about.aboutUs.openSource")).map((part, index, array) => (
                    index < array.length - 1 ? (
                      <span key={index}>
                        {part}
                        <a
                          href="https://github.com/Jawafdehi"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                        >
                          {t("about.aboutUs.openSource")}
                        </a>
                      </span>
                    ) : part
                  ))}
                </p>
              </div>

              <div>
                <Eyebrow className="mb-4">
                  {t("about.building.eyebrow", "What we do")}
                </Eyebrow>
                <h2 className="font-home-display mb-5 text-3xl text-primary md:text-4xl">{t("about.building.title")}</h2>
                <p className="text-lg leading-8 text-muted-foreground">
                  {t("about.building.description1")}
                </p>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  {t("about.building.description2")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <CoreValues />

      </div>

    </div>
  );
};

export default About;
