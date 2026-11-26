/**
 * Turn bare URLs inside free-text descriptions into link segments.
 *
 * Material descriptions and case evidence notes are plain text, and many end
 * in "Source: https://ekantipur.com/…" with no structured SOURCE_PAGE link, so
 * the reader got an unclickable, unbreakable URL. Only http(s) URLs become
 * links; anything else (javascript:, data:, bare domains) stays text.
 */

export type TextSegment =
  | { kind: "text"; text: string }
  | { kind: "link"; href: string; label: string; title: string };

// A URL runs to the next whitespace. Trailing sentence punctuation (including
// the Devanagari danda । and ॥) and an unbalanced closing bracket
// ("… (https://x.com/a/1)") are trimmed off below.
const URL_RE = /https?:\/\/[^\s<>"]+/gi;
const TRAILING_PUNCT = /[.,;:!?'"’”।॥]+$/;

// News outlets and platforms that show up as sources, by host (sans www./m.).
// Anything not listed is labelled with its host name.
const KNOWN_SOURCES: Record<string, string> = {
  "ekantipur.com": "Kantipur",
  "kantipurdaily.com": "Kantipur",
  "kathmandupost.com": "The Kathmandu Post",
  "setopati.com": "Setopati",
  "en.setopati.com": "Setopati",
  "onlinekhabar.com": "Onlinekhabar",
  "english.onlinekhabar.com": "Onlinekhabar",
  "ratopati.com": "Ratopati",
  "nagariknews.nagariknetwork.com": "Nagarik",
  "myrepublica.nagariknetwork.com": "Republica",
  "annapurnapost.com": "Annapurna Post",
  "gorkhapatraonline.com": "Gorkhapatra",
  "risingnepaldaily.com": "The Rising Nepal",
  "himalkhabar.com": "Himal Khabar",
  "nepalnews.com": "Nepal News",
  "bbc.com": "BBC",
  "x.com": "X",
  "twitter.com": "X",
  "facebook.com": "Facebook",
  "fb.watch": "Facebook",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "tiktok.com": "TikTok",
  "instagram.com": "Instagram",
};

function trimUrl(raw: string): string {
  let url = raw;
  for (;;) {
    const before = url;
    url = url.replace(TRAILING_PUNCT, "");
    for (const [open, close] of [["(", ")"], ["[", "]"]] as const) {
      if (url.endsWith(close) && url.split(close).length > url.split(open).length) {
        url = url.slice(0, -1);
      }
    }
    if (url === before) return url;
  }
}

/** Short human label for a URL: a known outlet's name, else its host. */
export function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^(www|m)\./, "");
    return KNOWN_SOURCES[host] ?? host;
  } catch {
    return url;
  }
}

/** The URL with %-escapes decoded, for a readable hover tooltip. */
export function decodedUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

export function linkifyText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const href = trimUrl(match[0]);
    try {
      new URL(href);
    } catch {
      continue;
    }
    if (start > last) segments.push({ kind: "text", text: text.slice(last, start) });
    segments.push({ kind: "link", href, label: sourceLabel(href), title: decodedUrl(href) });
    last = start + href.length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}
