import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Seo } from "@/components/Seo";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

export default function Feedback() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`Submit Feedback | ${SITE_NAME}`}
        description="Share your feedback, suggestions, or corrections with the Jawafdehi team to help improve Nepal's corruption accountability platform."
        canonicalUrl={`${SITE_URL}/feedback/`}
      />

      <main id="main-content" className="flex-1">
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

    </div>
  );
}
