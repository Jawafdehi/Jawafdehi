import { Footer } from "@/components/Footer";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { EntityDetailContainer } from "@/components/EntityDetailContainer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Info } from "lucide-react";
import { getJawafEntityById } from "@/services/jds-api";
import type { JawafEntity } from "@/types/jds";

export default function EntityProfile() {
  const { t } = useTranslation();
  const { id: encodedId } = useParams();
  const [nesId, setNesId] = useState<string | null>(null);
  const [jawafEntity, setJawafEntity] = useState<JawafEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntityId() {
      if (!encodedId) {
        setError(t("entityProfile.noEntityId"));
        setLoading(false);
        return;
      }

      const decodedId = decodeURIComponent(encodedId);
      const numericId = parseInt(decodedId, 10);

      if (isNaN(numericId)) {
        setError(t("entityProfile.invalidEntityId"));
        setLoading(false);
        return;
      }

      // Fetch the Jawaf entity to get its nes_id
      try {
        const entity = await getJawafEntityById(numericId);
        if (!entity) {
          setError(t("entityProfile.entityNotFound"));
        } else {
          setJawafEntity(entity);
          if (entity.nes_id) {
            setNesId(entity.nes_id);
          }
          // If no nes_id, we'll show basic Jawaf entity info
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("entityProfile.failedToFetch"));
      }

      setLoading(false);
    }

    fetchEntityId();
  }, [encodedId, t]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {jawafEntity && (
        <Helmet>
          <title>{jawafEntity.display_name} | Jawafdehi</title>
          <meta property="og:title" content={jawafEntity.display_name} />
          <meta property="og:description" content={`View profile and allegations for ${jawafEntity.display_name} on Jawafdehi.`} />
        </Helmet>
      )}
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/entities">{t("entityProfile.backToEntities")}</Link>
        </Button>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : jawafEntity ? (
          <EntityDetailContainer
            entityId={nesId || undefined}
            jawafEntityId={jawafEntity.id}
            jawafEntityName={jawafEntity.display_name}
            hasNesData={!!nesId}
            allegedCaseIds={jawafEntity.alleged_cases || []}
            relatedCaseIds={jawafEntity.related_cases || []}
          />
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("entityProfile.invalidId")}</AlertDescription>
          </Alert>
        )}
      </main>

      <Footer />


    </div>
  );
}
