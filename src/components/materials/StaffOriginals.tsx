import { useState } from "react";
import { Download, Eye, FileText, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getMaterialOriginal,
  type OriginalArtifact,
  type StaffOriginals as StaffOriginalsFlags,
} from "@/services/datalake-api";

/**
 * The staff-only originals of a document: the file as the publisher issued it,
 * and our UNREDACTED transcript.
 *
 * Shown only when the material payload carries `jawafdehi:staffOriginals`,
 * which the API adds for callers holding the unredacted permission and for
 * nobody else. The buttons never hold a URL: each click asks the API for a
 * signed link that expires within minutes, so nothing on the page (or in a
 * shared screenshot of its HTML) leads anywhere afterwards.
 */
const BUTTON_CLASS = "h-auto min-h-11 justify-start gap-3 px-4 py-2.5 text-left";

export function StaffOriginals({ tail, flags }: { tail: string; flags: StaffOriginalsFlags }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function open(artifact: OriginalArtifact, download: boolean) {
    const id = `${artifact}:${download ? "download" : "view"}`;
    // A publisher's file is its own URL, served with headers we do not control,
    // so "download" could replace this page with it: give it a tab too.
    const publisher = artifact === "document" && flags.documentHostedBy === "publisher";
    // Opened inside the click, before the request: a window opened after an
    // await is a popup, and mobile Safari blocks it.
    const tab = !download || publisher ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    setBusy(id);
    try {
      const link = await getMaterialOriginal(tail, artifact, download);
      if (tab) tab.location.href = link.url;
      // Ours, signed as an attachment: downloads without leaving the page.
      else if (link.hosted_by === "us") window.location.assign(link.url);
      else window.open(link.url, "_blank", "noopener");
    } catch {
      tab?.close();
      toast.error("Could not open the original. Your session may have expired; sign in again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="material-staff-originals-heading" data-testid="staff-originals">
      <h2
        id="material-staff-originals-heading"
        className="flex items-center gap-2 text-lg font-semibold text-foreground"
      >
        <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Staff only
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Unredacted. Do not share these files or their links.
      </p>
      <div className="mt-4 grid gap-3">
        {flags.document ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className={BUTTON_CLASS}
              disabled={busy !== null}
              onClick={() => open("document", false)}
            >
              <Eye className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              View original
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={BUTTON_CLASS}
              disabled={busy !== null}
              onClick={() => open("document", true)}
            >
              <Download className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              Download original
            </Button>
          </>
        ) : null}
        {flags.transcript ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className={BUTTON_CLASS}
              disabled={busy !== null}
              onClick={() => open("transcript", false)}
            >
              <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              Unredacted transcript
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={BUTTON_CLASS}
              disabled={busy !== null}
              onClick={() => open("transcript", true)}
            >
              <Download className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              Download unredacted transcript
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}
