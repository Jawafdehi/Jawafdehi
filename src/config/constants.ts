export const JAWAFDEHI_WHATSAPP_NUMBER = "+977 9768630501";
export const JAWAFDEHI_EMAIL = "inquiry@jawafdehi.org";

// Every channel the organisation actually runs. Keep this in step with the
// canonical list in the meta repo at docs/branding/narrative.md §13 — that is
// where the URLs get re-checked, and it is what the newsletters link to.
// Note the TikTok handle: it is @jawafdehi, not @jawafdehi_initiative. The
// latter is a dead account that still returns HTTP 200, so a status-code link
// check will never catch it.
export const JAWAFDEHI_SOCIALS = {
  facebook: "https://www.facebook.com/jawafdehi",
  x: "https://x.com/jawafdehi",
  instagram: "https://www.instagram.com/jawafdehi",
  tiktok: "https://www.tiktok.com/@jawafdehi",
  youtube: "https://www.youtube.com/@Jawafdehi",
  linkedin: "https://www.linkedin.com/company/jawafdehi",
  discord: "https://discord.gg/grpRaczPq4",
  whatsapp: "https://api.whatsapp.com/send?phone=9779768630501",
  linktree: "https://linktr.ee/jawafdehi",
};

export const JAWAFDEHI_WEEKLY_SERIES = {
  zoomUrl:
    "https://harvard.zoom.us/j/97798419283?pwd=sOSmM8Nuqp29j9NIhqe0yWJGLgokPI.1",
  zoomMeetingId: "977 9841 9283",
  zoomPasscode: "682332",
  youtubeChannel: JAWAFDEHI_SOCIALS.youtube,
  // @Jawafdehi channel ID — used to fetch the latest episode for the page hero.
  youtubeChannelId: "UCbfZ3pFAUi4hOTM-JXIPmbg",
  // Playlist not created yet — set once the corruption-series playlist exists
  // to switch the page from a channel link to an embedded player.
  youtubePlaylistId: "",
  // Recurring meeting time, defined in Nepal time (Asia/Kathmandu, fixed UTC+5:45).
  // The page derives Pacific/Eastern equivalents natively, accounting for US DST.
  meetingWeekday: 5, // 0 = Sunday … 5 = Friday
  meetingHour: 19, // 19:00 NPT
  meetingMinute: 0,
};
