import { ReactNode } from "react";

// The casework pages (Reviews / ReviewDetail / Rules / How) used to render
// their own full-screen chrome + auth/role gate via this component when they
// lived at /portal. They have since been folded into the unified admin panel
// (/admin), where <AdminLayout> provides the sidebar shell, the OIDC auth
// guard, and the role gate. So this is now a thin pass-through: it keeps the
// pages' existing `<CaseworkLayout>…</CaseworkLayout>` wrapping working without
// double-rendering chrome.
export default function CaseworkLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
