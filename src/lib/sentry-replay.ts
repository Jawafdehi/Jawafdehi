// SPDX-License-Identifier: Hippocratic-3.0
// Sentry Session Replay, on its own so it can be imported dynamically. Replay is
// most of Sentry's weight (~25 KB gzip) and is only ever kept when an error
// fires, so it does not need to be in the first-paint download.
export { replayIntegration } from "@sentry/react";
