import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, Shield, Search, FileCheck, Lock, Users, TrendingUp } from "lucide-react";

const Information = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Information &amp; FAQ | Jawafdehi Nepal</title>
        <meta name="description" content="Learn how Jawafdehi verifies corruption cases, what constitutes corruption in Nepal, and how you can report or use information from the platform." />
        <link rel="canonical" href="https://jawafdehi.org/information" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/information" />
        <meta property="og:title" content="Information &amp; FAQ | Jawafdehi Nepal" />
        <meta property="og:description" content="Learn how Jawafdehi verifies corruption cases, what constitutes corruption in Nepal, and how you can report or use information from the platform." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Information &amp; FAQ | Jawafdehi Nepal" />
        <meta name="twitter:description" content="Learn how Jawafdehi verifies corruption cases, what constitutes corruption in Nepal, and how you can report or use information from the platform." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>
      <Header />

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
                {t("information.title")}
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                {t("information.subtitle")}
              </p>
            </div>
          </div>
        </section>

        {/* What is Corruption Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">{t("information.whatIsCorruption.title")}</h2>
              </div>
              <Card className="mb-8">
                <CardContent className="pt-6">
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    {t("information.whatIsCorruption.description")}
                  </p>

                  <h3 className="text-xl font-semibold text-foreground mb-4">{t("information.whatIsCorruption.typesTitle")}</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-l-primary pl-4">
                      <h4 className="font-semibold text-foreground mb-1">{t("information.whatIsCorruption.bribery.title")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("information.whatIsCorruption.bribery.description")}
                      </p>
                    </div>
                    <div className="border-l-4 border-l-primary pl-4">
                      <h4 className="font-semibold text-foreground mb-1">{t("information.whatIsCorruption.embezzlement.title")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("information.whatIsCorruption.embezzlement.description")}
                      </p>
                    </div>
                    <div className="border-l-4 border-l-primary pl-4">
                      <h4 className="font-semibold text-foreground mb-1">{t("information.whatIsCorruption.nepotism.title")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("information.whatIsCorruption.nepotism.description")}
                      </p>
                    </div>
                    <div className="border-l-4 border-l-primary pl-4">
                      <h4 className="font-semibold text-foreground mb-1">{t("information.whatIsCorruption.conflictOfInterest.title")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("information.whatIsCorruption.conflictOfInterest.description")}
                      </p>
                    </div>
                    <div className="border-l-4 border-l-primary pl-4">
                      <h4 className="font-semibold text-foreground mb-1">{t("information.whatIsCorruption.abuseOfResources.title")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("information.whatIsCorruption.abuseOfResources.description")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Vetting Process */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold text-foreground">{t("information.verification.title")}</h2>
              </div>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t("information.verification.description")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary" />
                      {t("information.verification.sourceCollection.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t("information.verification.sourceCollection.description")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      {t("information.verification.crossVerification.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t("information.verification.crossVerification.description")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {t("information.verification.teamReview.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t("information.verification.teamReview.description")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      {t("information.verification.continuousUpdates.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t("information.verification.continuousUpdates.description")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    {t("information.verification.standards.title")}
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{t("information.verification.standards.minSources")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{t("information.verification.standards.officialDocs")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{t("information.verification.standards.clearDistinction")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{t("information.verification.standards.rightToRespond")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{t("information.verification.standards.protectSources")}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-8">{t("information.faq.title")}</h2>

              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left">
                    {t("information.faq.howToReport.question")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      {t("information.faq.howToReport.answer1")}
                    </p>
                    <p className="text-muted-foreground">
                      {t("information.faq.howToReport.answer2")}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left">
                    {t("information.faq.afterSubmit.question")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      {t("information.faq.afterSubmit.answer")}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left">
                    {t("information.faq.anonymous.question")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      {t("information.faq.anonymous.answer")}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-left">
                    {t("information.faq.entityResponse.question")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      {t("information.faq.entityResponse.answer")}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-left">
                    {t("information.faq.inaccurate.question")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      {t("information.faq.inaccurate.answer")}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-left">
                    {t("information.faq.funding.question")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      {t("information.faq.funding.answer")}
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-7">
                  <AccordionTrigger className="text-left">
                    {t("information.faq.useInfo.question")}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      {t("information.faq.useInfo.answer")}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <Footer />


    </div>
  );
};

export default Information;
