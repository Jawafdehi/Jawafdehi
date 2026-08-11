import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { PauseCircle, Play, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JAWAFDEHI_WEEKLY_SERIES } from "@/config/constants";
import { SITE_NAME, SOCIAL_IMAGE_URL } from "@/utils/seo";

type LatestVideo = {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string;
  thumbnailMaxRes: string;
};

const WeeklyMeetings = () => {
  const { t } = useTranslation();
  const { youtubeChannel, youtubePlaylistId } = JAWAFDEHI_WEEKLY_SERIES;

  // Recent episodes, fetched at runtime so the list tracks the channel weekly
  // with no rebuild. Worker route handles the YouTube feed + edge caching.
  const [videos, setVideos] = useState<LatestVideo[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/api/latest-videos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { videos?: LatestVideo[] } | null) => {
        if (active && data?.videos?.length) {
          setVideos(data.videos);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Weekly Corruption Series — Jawafdehi</title>
        <meta
          name="description"
          content="Jawafdehi's weekly corruption series breaking down Nepal's corruption cases. The live series is currently on pause; past presentations remain available on YouTube."
        />
        <link rel="canonical" href="https://jawafdehi.org/saptahik/" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/saptahik/" />
        <meta property="og:title" content="Weekly Corruption Series — Jawafdehi" />
        <meta
          property="og:description"
          content="Jawafdehi's weekly corruption series breaking down Nepal's corruption cases. The live series is currently on pause; past presentations remain available on YouTube."
        />
        <meta property="og:image" content={SOCIAL_IMAGE_URL} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Weekly Corruption Series — Jawafdehi" />
        <meta
          name="twitter:description"
          content="Jawafdehi's weekly corruption series breaking down Nepal's corruption cases. The live series is currently on pause; past presentations remain available on YouTube."
        />
        <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
      </Helmet>

      <main id="main-content" className="flex-1">
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-eyebrow font-eyebrow-display text-primary">
              {t("weeklyMeetings.eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {t("weeklyMeetings.title")}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {t("weeklyMeetings.intro")}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-primary/30 bg-primary/5 px-6 py-5">
            <div className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                {t("weeklyMeetings.status.heading")}
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("weeklyMeetings.status.body")}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Youtube className="h-5 w-5 text-primary" />
                  {t("weeklyMeetings.youtube.heading")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {t("weeklyMeetings.youtube.description")}
                </p>
                <Button asChild variant="outline" className="w-full">
                  <a href={youtubeChannel} target="_blank" rel="noopener noreferrer">
                    <Youtube className="h-4 w-4" />
                    {t("weeklyMeetings.youtube.cta")}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {videos.length > 0 && (
            <div className="mx-auto mt-12 max-w-4xl">
              <h2 className="text-lg font-semibold text-foreground">
                {t("weeklyMeetings.pastPresentations.heading")}
              </h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                {videos.map((video) => (
                  <a
                    key={video.videoId}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-2xl border bg-secondary/30 transition-shadow duration-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white transition-colors duration-200 group-hover:bg-primary">
                          <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                        </span>
                      </span>
                    </div>
                    <p className="line-clamp-2 px-4 py-3 text-sm font-medium text-foreground md:line-clamp-3">
                      {video.title}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {youtubePlaylistId && (
            <div className="mx-auto mt-12 max-w-4xl">
              <div className="aspect-video overflow-hidden rounded-2xl border bg-secondary/30">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/videoseries?list=${youtubePlaylistId}`}
                  title={t("weeklyMeetings.youtube.playlistTitle")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default WeeklyMeetings;
