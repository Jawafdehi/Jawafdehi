import type { ReactNode } from "react";

import { currentSiteVariant, type SiteVariant } from "@/lib/site-host";

/**
 * Content that belongs to one public site only: jawafdehi.org ("org") or
 * jawafdehi.org.np ("np"). See src/lib/site-host.ts for why this is done in
 * the client and with CSS rather than in the Worker.
 *
 * On the client only the current host's content is rendered. During
 * pre-render (variant unknown) it is emitted marked with `data-site-variant`,
 * and the pre-paint marker in index.html plus the rules in src/index.css hide
 * the other host's copy before first paint.
 */
export function SiteOnly({
  site,
  inline = false,
  children,
}: {
  site: SiteVariant;
  /** Render as a <span> (inside running text) instead of a block <div>. */
  inline?: boolean;
  children: ReactNode;
}) {
  const variant = currentSiteVariant();
  if (variant !== null && variant !== site) return null;
  return inline ? (
    <span data-site-variant={site} data-site-inline="">
      {children}
    </span>
  ) : (
    <div data-site-variant={site}>{children}</div>
  );
}

/** The public contact domain for each site. Both reach the same mailboxes. */
const SITE_EMAIL_DOMAIN: Record<SiteVariant, string> = {
  org: "jawafdehi.org",
  np: "jawafdehi.org.np",
};

/**
 * A mailto link to one of our role addresses (privacy@, inquiry@, report@),
 * on the domain of the site being read: jawafdehi.org.np shows the .org.np
 * address. jawafdehi.org.np is a Google Workspace alias domain of
 * jawafdehi.org, so both addresses land in the same mailbox.
 */
export function SiteEmail({
  local,
  className = "text-primary hover:underline",
}: {
  local: "privacy" | "inquiry" | "report";
  className?: string;
}) {
  return (
    <>
      {(["org", "np"] as const).map((site) => {
        const address = `${local}@${SITE_EMAIL_DOMAIN[site]}`;
        return (
          <SiteOnly key={site} site={site} inline>
            <a href={`mailto:${address}`} className={className}>
              {address}
            </a>
          </SiteOnly>
        );
      })}
    </>
  );
}
