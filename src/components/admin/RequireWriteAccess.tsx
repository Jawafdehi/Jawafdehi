import { ReactNode } from "react";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { FormError } from "@/components/admin/FormError";

// Page-level write gate for the admin panel. The panel gate (hasAdminAccess)
// only decides who enters the panel at all; individual write surfaces
// (entity create/edit, data-lake forms) need a narrower role that the backend
// enforces on write. Without this, a role-less-for-this-section user (e.g. a
// caseworker on /admin/entities/new) gets the full interactive form and only
// discovers they can't submit when the API 403s — wasted effort and a dead end.
//
// The API remains the authorization authority; this simply keeps the UI honest
// so the offered controls match what the user can actually do. Mirrors how the
// Moderation page already gates itself.
export default function RequireWriteAccess({
  can,
  children,
  message = "You don't have permission to edit this section. Ask an admin to grant you access.",
}: {
  // Predicate over the user's roles (e.g. hasNesWriteAccess from lib/roles).
  can: (roles: string[]) => boolean;
  children: ReactNode;
  message?: string;
}) {
  const { user } = useCaseworkAuth();
  const roles = user?.roles ?? [];
  if (!can(roles)) {
    return (
      <div className="max-w-2xl">
        <FormError message={message} />
      </div>
    );
  }
  return <>{children}</>;
}
