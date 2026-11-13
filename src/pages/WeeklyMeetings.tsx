import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PauseCircle, Play, Youtube } from "@/components/icons";

import { LightHero } from "@/components/ui/light-hero";
import { Seo } from "@/components/Seo";
import { JAWAFDEHI_WEEKLY_SERIES } from "@/config/constants";
import { SITE_URL } from "@/utils/seo";

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
      <Seo
        title="Weekly Corruption Series — Jawafdehi"
        description="Jawafdehi's weekly corruption series breaking down Nepal's corruption cases. The live series is currently on pause; past presentations remain available on YouTube."
        canonicalUrl={`${SITE_URL}/saptahik/`}
      />

      <main id="main-content" className="flex-1">
        <LightHero
          id="saptahik-title"
          shader={false}
          eyebrow={t("weeklyMeetings.eyebrow")}
          title={t("weeklyMeetings.title")}
          description={t("weeklyMeetings.intro")}
          actions={
            <a
              href={youtubeChannel}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-surface px-5 text-[15px] text-primary-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-primary-surface/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:active:scale-100"
            >
              <Youtube className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("weeklyMeetings.youtube.cta")}
            </a>
          }
        />

        <div className="layout-container pb-20">
          {/* Why it is paused, beside someone sitting it out. */}
          <section
            aria-labelledby="saptahik-status"
            className="grid items-center gap-6 rounded-[24px] border border-border/70 bg-surface p-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8 md:p-8"
          >
            <img
              src="/assets/illustrations/meditating.svg"
              alt=""
              aria-hidden="true"
              loading="lazy"
              width={1024}
              height={768}
              className="h-auto w-40 sm:w-full"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <PauseCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <h2 id="saptahik-status" className="font-home-display text-2xl text-primary md:text-[1.75rem]">
                  {t("weeklyMeetings.status.heading")}
                </h2>
              </div>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-muted-foreground">{t("weeklyMeetings.status.body")}</p>
              <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground">
                {t("weeklyMeetings.youtube.description")}
              </p>
            </div>
          </section>

          {videos.length > 0 && (
            <section aria-labelledby="saptahik-past" className="mt-16">
              <h2 id="saptahik-past" className="font-home-display text-3xl text-primary md:text-4xl">
                {t("weeklyMeetings.pastPresentations.heading")}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <a
                    key={video.videoId}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-[20px] border border-border/70 bg-surface transition-[border-color] duration-200 ease-out hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-surface/80 text-white backdrop-blur-sm transition-colors duration-200 group-hover:bg-accent">
                          <Play className="h-5 w-5 translate-x-0.5 fill-current" aria-hidden="true" />
                        </span>
                      </span>
                    </div>
                    <p className="line-clamp-2 px-5 py-4 text-base leading-snug text-primary">{video.title}</p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {youtubePlaylistId && (
            <div className="mt-16 aspect-video overflow-hidden rounded-[24px] border border-border/70 bg-muted">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/videoseries?list=${youtubePlaylistId}`}
                title={t("weeklyMeetings.youtube.playlistTitle")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WeeklyMeetings;
