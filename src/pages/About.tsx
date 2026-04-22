import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Eye, Target, Users } from "lucide-react";
import { Helmet } from "react-helmet-async";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>About | Jawafdehi Nepal</title>
        <meta name="description" content="Learn about Jawafdehi — Nepal's open corruption accountability platform. Meet the team behind Let's Build Nepal and NewNepal.org working to promote transparency." />
        <link rel="canonical" href="https://jawafdehi.org/about" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/about" />
        <meta property="og:title" content="About | Jawafdehi Nepal" />
        <meta property="og:description" content="Learn about Jawafdehi — Nepal's open corruption accountability platform. Meet the team behind Let's Build Nepal and NewNepal.org working to promote transparency." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About | Jawafdehi Nepal" />
        <meta name="twitter:description" content="Learn about Jawafdehi — Nepal's open corruption accountability platform. Meet the team behind Let's Build Nepal and NewNepal.org working to promote transparency." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
                {t("about.title")}
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                {t("about.subtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* About Us Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">{t("about.aboutUs.title")}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("about.aboutUs.description").split(t("about.aboutUs.openSource")).map((part, index, array) => (
                    index < array.length - 1 ? (
                      <span key={index}>
                        {part}
                        <a
                          href="https://github.com/Jawafdehi"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {t("about.aboutUs.openSource")}
                        </a>
                      </span>
                    ) : part
                  ))}
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">What We're Building</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Corruption-related records are scattered across dozens of government portals, court systems, and public databases — inaccessible to most citizens. We are building the technology and the volunteer network to bring it all into one permanent, publicly searchable knowledge base.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Free to use. Open source. Built entirely by Nepali volunteers who believe accountability has no expiry date.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-10 text-center">{t("about.values.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Shield className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{t("about.values.integrity.title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("about.values.integrity.description")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Eye className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{t("about.values.transparency.title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("about.values.transparency.description")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Target className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{t("about.values.accuracy.title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("about.values.accuracy.description")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{t("about.values.publicService.title")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("about.values.publicService.description")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />


    </div>
  );
};

export default About;
