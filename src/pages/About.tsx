import { useTranslation } from "react-i18next";
import { CoreValues } from "@/components/about/core-values";
import { AboutHero } from "@/components/about/hero";
import { Helmet } from "react-helmet-async";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>About | Jawafdehi Nepal</title>
        <meta name="description" content="Learn about Jawafdehi — Nepal's open corruption accountability platform. Meet the team behind Let's Build Nepal working to promote transparency." />
        <link rel="canonical" href="https://jawafdehi.org/about" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/about" />
        <meta property="og:title" content="About | Jawafdehi Nepal" />
        <meta property="og:description" content="Learn about Jawafdehi — Nepal's open corruption accountability platform. Meet the team behind Let's Build Nepal and  working to promote transparency." />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About | Jawafdehi Nepal" />
        <meta name="twitter:description" content="Learn about Jawafdehi — Nepal's open corruption accountability platform. Meet the team behind Let's Build Nepal and working to promote transparency." />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
      </Helmet>

      <main id="main-content" className="flex-1">
        <AboutHero />

        {/* About Us Section */}
        <section id="about-us" className="bg-muted/10 pt-12 pb-8 md:pt-14 md:pb-10 lg:pt-16 lg:pb-10">
          <div className="container mx-auto px-4">
            <div className="grid gap-9 md:grid-cols-2 md:gap-12 lg:gap-16">
              <div className="max-w-[44rem]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {t("about.aboutUs.eyebrow", "Who we are")}
                </p>
                <h2 className="mb-4 text-2xl font-bold tracking-normal text-foreground md:text-3xl">{t("about.aboutUs.title")}</h2>
                <p className="text-justify text-base leading-8 text-foreground/75 md:text-[1.0625rem]">
                  {t("about.aboutUs.description").split(t("about.aboutUs.openSource")).map((part, index, array) => (
                    index < array.length - 1 ? (
                      <span key={index}>
                        {part}
                        <a
                          href="https://github.com/Jawafdehi"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {t("about.aboutUs.openSource")}
                        </a>
                      </span>
                    ) : part
                  ))}
                </p>
              </div>

              <div className="ml-auto max-w-[44rem] text-left md:mr-8 lg:mr-16">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {t("about.building.eyebrow", "What we do")}
                </p>
                <h2 className="mb-4 text-2xl font-bold tracking-normal text-foreground md:text-3xl">{t("about.building.title")}</h2>
                <p className="text-justify text-base leading-8 text-foreground/75 md:text-[1.0625rem]">
                  {t("about.building.description1")}
                </p>
                <p className="mt-5 text-justify text-base leading-8 text-foreground/75 md:text-[1.0625rem]">
                  {t("about.building.description2")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <CoreValues />

      </main>

    </div>
  );
};

export default About;
