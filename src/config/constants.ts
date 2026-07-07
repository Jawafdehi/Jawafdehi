export const JAWAFDEHI_WHATSAPP_NUMBER = "+977 9749226442";
export const JAWAFDEHI_EMAIL = "inquiry@jawafdehi.org";

export const JAWAFDEHI_SOCIALS = {
  facebook: "https://www.facebook.com/jawafdehi",
  youtube: "https://www.youtube.com/@Jawafdehi",
  linkedin: "https://www.linkedin.com/company/jawafdehi-initiative",
  whatsapp: "https://api.whatsapp.com/send?phone=9779749226442",
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
