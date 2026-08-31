// SPDX-License-Identifier: Hippocratic-3.0
import type { ComponentProps, FunctionComponent } from "react";
import type { QRCodeSVG } from "qrcode.react";

import { lazyChart } from "@/components/charts/lazy";

type QRCodeSVGProps = ComponentProps<typeof QRCodeSVG>;

/**
 * `qrcode.react`, deferred out of the initial payload.
 *
 * Every QR code in the app lives inside a share dialog/expander that only
 * mounts on interaction, yet the library was in the entry chunk because the
 * share components (imported by the eager, pre-rendered CaseDetail page)
 * imported it statically. Interaction-triggered UI is exactly the
 * lazyChart-shaped candidate docs/testing/bundle-and-code-splitting.md §4
 * describes, so this reuses that helper: load in an effect, no Suspense
 * boundary (see the failed-boundary trap documented in charts/lazy.tsx).
 *
 * The placeholder reserves the QR's exact box so the dialog does not shift
 * when the chunk arrives. Nothing here is ever in pre-rendered HTML — dialog
 * content mounts only when opened — so this changes no pre-rendered bytes.
 */
export const LazyQRCodeSVG = lazyChart<QRCodeSVGProps>(
  () =>
    import("qrcode.react").then(
      (m) => m.QRCodeSVG as unknown as FunctionComponent<QRCodeSVGProps>,
    ),
  (props) => (
    <div
      aria-hidden="true"
      style={{ width: props.size ?? 128, height: props.size ?? 128 }}
    />
  ),
);
