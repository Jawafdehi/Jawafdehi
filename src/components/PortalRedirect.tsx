import { Navigate, useLocation } from "react-router-dom";

/** Back-compat redirect: /portal/<rest> -> /admin/<rest>, preserving the query. */
export const PortalRedirect = () => {
  const location = useLocation();
  const dest =
    location.pathname.replace(/^\/portal/, "/admin") + location.search;
  return <Navigate to={dest} replace />;
};
