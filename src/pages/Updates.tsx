import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { updates } from "@/data/updates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarIcon, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { useTranslation } from "react-i18next";

const Updates = () => {
    const { t } = useTranslation();
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Helmet>
                <title>Updates | Jawafdehi</title>
                <meta name="description" content={t("updates.description")} />
            </Helmet>
            <Header />

            <main className="flex-1 py-12">
                <div className="container max-w-5xl mx-auto space-y-8 px-4 animate-fade-in">
                    <div className="space-y-4">
                        <h1 className="text-3xl font-bold tracking-tight">{t("updates.title")}</h1>
                        <p className="text-muted-foreground text-lg">
                            {t("updates.description")}
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {updates.map((update) => (
                            <Link key={update.id} to={`/updates/${update.id}`}>
                                <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-muted">
                                    <CardHeader>
                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                                            <CalendarIcon className="h-4 w-4" />
                                            <span>{update.date}</span>
                                        </div>
                                        <CardTitle className="text-xl md:text-2xl hover:text-primary transition-colors">
                                            {update.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center text-primary font-medium">
                                            {t("updates.readMore")} <ChevronRight className="ml-1 h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>

      <Footer />

      
        </div>
    );
};

export default Updates;
