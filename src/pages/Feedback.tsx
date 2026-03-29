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
        <title>Feedback | Jawafdehi</title>
        <meta name="description" content={t("feedback.description")} />
      </Helmet>
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
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
