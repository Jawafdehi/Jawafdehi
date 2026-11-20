import { Navigate } from "react-router-dom";

import { whatsNewListPath } from "@/data/whats-new";

/**
 * The retired /whats-new page, reached inside the app: the changelog now lives
 * on Updates & News as its product updates. The edge answers the same URL with
 * a 301 (see worker.ts).
 */
export function WhatsNewRedirect() {
  return <Navigate to={whatsNewListPath()} replace />;
}
