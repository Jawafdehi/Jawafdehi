export const JAWAFDEHI_WHATSAPP_NUMBER = "+977 9768630501";
export const JAWAFDEHI_EMAIL = "inquiry@jawafdehi.org";

// Every channel the organisation actually runs. Keep this in step with the
// canonical list in the meta repo at docs/branding/narrative.md §13 — that is
// where the URLs get re-checked, and it is what the newsletters link to.
// Verify Discord invites against https://discord.com/api/v10/invites/<code>.
// discord.gg 301s to discord.com/invite/<code> and serves 200 even for an
// invite that no longer exists, so a link checker cannot tell you anything
// useful. The home CTA had a dead invite hardcoded past this constant.
export const JAWAFDEHI_SOCIALS = {
  facebook: "https://www.facebook.com/jawafdehi",
  x: "https://x.com/jawafdehi",
  instagram: "https://www.instagram.com/jawafdehi",
  tiktok: "https://www.tiktok.com/@jawafdehi",
  youtube: "https://www.youtube.com/@Jawafdehi",
  linkedin: "https://www.linkedin.com/company/jawafdehi",
  // No expiry. Supersedes grpRaczPq4.
  discord: "https://discord.gg/mRYbcEAuaQ",
  whatsapp: "https://api.whatsapp.com/send?phone=9779768630501",
  linktree: "https://linktr.ee/jawafdehi",
};

// The Open House is a recurring Zoom meeting set to "No Fixed Time", so this
// link is permanent: the session time moves every week to suit whichever
// audience is coming, and the link never changes with it. Do not replace this
// with a per-session scheduled meeting — in Zoom the link IS the meeting ID, so
// a new meeting each week would break every printed flyer and saved link.
// The waiting room is on; the host admits people.
export const JAWAFDEHI_OPEN_HOUSE = {
  zoomUrl:
    "https://us06web.zoom.us/j/86403973104?pwd=Q1tJrWM86AZqCFQS8jaTaImmw2sa3I.1",
  zoomMeetingId: "864 0397 3104",
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
