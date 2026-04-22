import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { FeedbackForm } from "@/components/FeedbackForm";

export default function Feedback() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Submit Feedback | Jawafdehi Nepal</title>
        <meta name="description" content="Share your feedback, suggestions, or corrections with the Jawafdehi team to help improve Nepal's corruption accountability platform." />
        <link rel="canonical" href="https://jawafdehi.org/feedback" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/feedback" />
        <meta property="og:title" content="Submit Feedback | Jawafdehi Nepal" />
        <meta property="og:description" content="Share your feedback, suggestions, or corrections with the Jawafdehi team to help improve Nepal's corruption accountability platform." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Submit Feedback | Jawafdehi Nepal" />
        <meta name="twitter:description" content="Share your feedback, suggestions, or corrections with the Jawafdehi team to help improve Nepal's corruption accountability platform." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                <CardTitle className="text-3xl">{t("feedback.title")}</CardTitle>
              </div>
              <CardDescription className="text-base">
                {t("feedback.titleDescription")}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <FeedbackForm />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />


    </div>
  );
}
