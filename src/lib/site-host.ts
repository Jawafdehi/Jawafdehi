/**
 * Which public site this page is being served as.
 *
 * One Worker ("jawafdehi") serves both jawafdehi.org and jawafdehi.org.np with
 * the same build and no redirect. They differ only in who the footer names as
 * the operator: jawafdehi.org.np is the Nepal entity's site and does not
 * attribute the US entity (Jawafdehi Initiative, Inc.).
 *
 * The pre-rendered HTML is the same file for both hosts, so it cannot know the
 * host. It carries both variants, marked with `data-site-variant`, and the
 * pre-paint script in index.html sets `data-site="np"` on <html> for
 * *.jawafdehi.org.np so CSS hides the .org variant before first paint. Once the
 * client renders, the Footer emits only the variant for the current host.
 * Keep NEPAL_SITE_HOST_PATTERN and the regex in index.html in step.
 */
export const NEPAL_SITE_HOST_PATTERN = /(^|\.)jawafdehi\.org\.np$/i;

export type SiteVariant = "org" | "np";

export function siteVariantForHost(hostname: string): SiteVariant {
  return NEPAL_SITE_HOST_PATTERN.test(hostname.replace(/\.$/, "")) ? "np" : "org";
}

/**
 * The variant for the page being rendered, or `null` during server rendering
 * (pre-render), where the host is unknown and both variants must be emitted.
 */
export function currentSiteVariant(): SiteVariant | null {
  if (typeof window === "undefined" || !window.location) return null;
  return siteVariantForHost(window.location.hostname);
}
