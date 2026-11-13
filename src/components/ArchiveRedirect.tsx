import { Navigate, useLocation } from "react-router-dom";

import { archiveSearchUrl, type ArchiveType } from "@/lib/archive-redirect";

/**
 * A retired browse page reached inside the app: replace it with the typed
 * /search, keeping its query string. The edge answers the same URLs with a
 * 301 (see worker.ts), so this only runs on client-side navigation.
 */
export function ArchiveRedirect({ type }: Readonly<{ type: ArchiveType }>) {
  const { search } = useLocation();
  return <Navigate to={archiveSearchUrl(type, search)} replace />;
}
