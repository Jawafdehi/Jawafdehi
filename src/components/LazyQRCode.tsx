// SPDX-License-Identifier: Hippocratic-3.0
//
// `qrcode.react`, loaded only when a QR code is actually asked for.
//
// Four share surfaces render a QR — ShareButton, InlineShareButtons,
// FloatingShareSidebar and MobileShareExpander — and every one of them imported
// `qrcode.react` at module scope. Two of those sit in the eagerly-loaded shell,
// so the encoder shipped in the initial payload of pages that never draw a QR at
// all. In every case the code lives inside a dialog or sheet the reader has to
// open first, which is the textbook case for a dynamic import: the bytes cannot
// be needed before a click.
//
// See docs/testing/bundle-and-code-splitting.md — only a dynamic import moves
// bytes off the critical path; a manualChunks split just renames them.
import { lazy, Suspense } from "react";

const QRCodeSVGLazy = lazy(() =>
  import("qrcode.react").then((m) => ({ default: m.QRCodeSVG })),
);

export interface LazyQRCodeProps {
  /** Kept for the download-as-PNG handlers, which read the SVG back by id. */
  id?: string;
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  includeMargin?: boolean;
}

export function LazyQRCode({ size = 200, ...props }: LazyQRCodeProps) {
  return (
    <Suspense
      // A blank box of the final size, so opening the dialog does not reflow
      // when the chunk lands. aria-hidden: this is the absence of the code, and
      // the surrounding copy already explains what the code is for.
      fallback={<div style={{ width: size, height: size }} aria-hidden="true" />}
    >
      <QRCodeSVGLazy size={size} {...props} />
    </Suspense>
  );
}
