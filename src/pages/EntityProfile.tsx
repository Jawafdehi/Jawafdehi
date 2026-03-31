import { Footer } from "@/components/Footer";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { EntityDetailContainer } from "@/components/EntityDetailContainer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { JawafEntity } from "@/types/jds";

const JDS_API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JDS_API_BASE_URL) ||
  'https://portal.jawafdehi.org/api';

export default function EntityProfile() {
  const { t } = useTranslation();
  const { id: encodedId } = useParams();

  const numericId = encodedId ? parseInt(decodeURIComponent(encodedId), 10) : NaN;
  const validId = !isNaN(numericId);

  const { data: jawafEntity, isLoading, isError } = useQuery({
    queryKey: ['jds-entity', numericId],
    queryFn: async () => {
      const res = await axios.get<JawafEntity>(`${JDS_API_BASE_URL}/entities/${numericId}/`);
      return res.data;
    },
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {jawafEntity && (
        <Helmet>
          <title>{jawafEntity.display_name} | Jawafdehi Nepal</title>
          <meta name="description" content={`View profile and corruption allegations for ${jawafEntity.display_name} on Jawafdehi — Nepal's open accountability database.`} />
          <link rel="canonical" href={`https://jawafdehi.org/entity/${jawafEntity.id}`} />
          <meta property="og:site_name" content="Jawafdehi Nepal" />
          <meta property="og:type" content="profile" />
          <meta property="og:url" content={`https://jawafdehi.org/entity/${jawafEntity.id}`} />
          <meta property="og:title" content={`${jawafEntity.display_name} | Jawafdehi Nepal`} />
          <meta property="og:description" content={`View profile and corruption allegations for ${jawafEntity.display_name} on Jawafdehi — Nepal's open accountability database.`} />
          <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
          <meta property="og:locale" content="en_US" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${jawafEntity.display_name} | Jawafdehi Nepal`} />
          <meta name="twitter:description" content={`View profile and corruption allegations for ${jawafEntity.display_name} on Jawafdehi — Nepal's open accountability database.`} />
          <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
        </Helmet>
      )}
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/entities">{t("entityProfile.backToEntities")}</Link>
        </Button>

        {!validId ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("entityProfile.invalidEntityId")}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : isError || !jawafEntity ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("entityProfile.entityNotFound")}</AlertDescription>
          </Alert>
        ) : (
          <EntityDetailContainer
            entityId={jawafEntity.nes_id || undefined}
            jawafEntityId={jawafEntity.id}
            jawafEntityName={jawafEntity.display_name}
            hasNesData={!!jawafEntity.nes_id}
            allegedCaseIds={jawafEntity.alleged_cases || []}
            relatedCaseIds={jawafEntity.related_cases || []}
          />
        )}
      </main>

      <Footer />


    </div>
  );
}
