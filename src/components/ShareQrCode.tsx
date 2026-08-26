import { Suspense, lazy } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The share QR code, behind a dynamic import.
 *
 * `qrcode.react` is 11.4 KB gzip and renders in exactly one place: a share
 * dialog that is closed on first paint, and therefore absent from every
 * pre-rendered page. Statically imported it sat on the initial payload of
 * every route carrying a share control — which is most of them. See
 * scripts/bundle-budget.mjs for why that number is the one being defended.
 *
 * `id` is load-bearing: each caller's "download QR" handler finds the rendered
 * SVG with document.getElementById, and those handlers already no-op when it
 * is missing — which is what a click during the (local, cached) chunk fetch
 * looks like.
 */
const QRCodeSVG = lazy(() =>
  import("qrcode.react").then((module) => ({ default: module.QRCodeSVG })),
);

export function ShareQrCode({
  url,
  id,
  size = 200,
}: Readonly<{ url: string; id?: string; size?: number }>) {
  return (
    // Same square either way, so the dialog does not resize on arrival.
    <Suspense fallback={<Skeleton style={{ height: size, width: size }} />}>
      <QRCodeSVG id={id} value={url} size={size} level="H" includeMargin={true} />
    </Suspense>
  );
}
