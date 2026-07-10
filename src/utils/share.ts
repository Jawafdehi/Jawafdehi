export type SharePlatform =
  | "facebook"
  | "twitter"
  | "linkedin"
  | "whatsapp"
  | "telegram"
  | "viber"
  | "reddit"
  | "messenger"
  | "threads"
  | "email";

export interface SharePayload {
  url: string;
  title: string;
  description?: string;
}

export function buildShareText({ title, description = "" }: Pick<SharePayload, "title" | "description">): string {
  return `${title}${description ? ` - ${description}` : ""}`;
}

export function buildShareLinks(payload: SharePayload): Record<SharePlatform, string> {
  const shareText = buildShareText(payload);
  const encodedUrl = encodeURIComponent(payload.url);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(payload.title);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    viber: `viber://forward?text=${encodedText}%20${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
    messenger: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodedUrl}`,
    threads: `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
  };
}
