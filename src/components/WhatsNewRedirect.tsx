import { Navigate, useLocation } from "react-router-dom";

import { asWhatsNewTag, whatsNewListPath } from "@/data/whats-new";

/**
 * The retired /whats-new page, reached inside the app: the changelog now lives
 * on Updates & News. Keeps ?tag= so /whats-new?tag=mcp still opens on the MCP
 * entries. The edge answers the same URL with a 301 (see worker.ts).
 */
export function WhatsNewRedirect() {
  const { search } = useLocation();
  return <Navigate to={whatsNewListPath(asWhatsNewTag(new URLSearchParams(search).get("tag")))} replace />;
}
