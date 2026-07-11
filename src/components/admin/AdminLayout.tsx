import { ReactNode, useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import {
  hasAdminAccess,
  hasNesWriteAccess,
  hasNgmWriteAccess,
  isModerator,
} from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Gavel,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

// The unified admin panel mounts at /admin (folds in the old /portal casework
// pages). Auth: OIDC + an internal role. The API is the authorization
// authority; this gate (hasAdminAccess, see lib/roles) just keeps role-less
// users out of a UI that would 403 on every call.

// Sidebar groups. A link shows for anyone who cleared the panel gate unless it
// narrows itself: `roles` (case-insensitive membership) or `canAccess` (an
// arbitrary predicate over the user's roles, used for the write-gated sections
// whose backend role set is more than a flat name match — see lib/roles).
interface NavItem {
  to: string;
  // i18n key under `admin.nav.*` — resolved at render so switching language
  // relabels the nav without rebuilding this static structure.
  labelKey: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles?: string[];
  canAccess?: (roles: string[], isAdmin: boolean) => boolean;
}
interface NavGroup {
  headingKey: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    headingKey: "admin.nav.overview",
    items: [
      { to: "/admin", labelKey: "admin.nav.dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    // v3: entity writes are gated on the single content-staff role (Caseworker,
    // + superuser) by the backend (entities/permissions.py). ReadOnly is not
    // accepted, so don't offer the (write) Entities section to it.
    headingKey: "admin.nav.entities",
    items: [
      {
        to: "/admin/entities",
        labelKey: "admin.nav.entities",
        icon: Network,
        canAccess: hasNesWriteAccess,
      },
    ],
  },
  {
    // v3: court-case / material / firm writes are gated on the single
    // content-staff role (Caseworker, + superuser) by the backend
    // (courts/permissions.py HasNgmRole). The old rate tiers are retired.
    headingKey: "admin.nav.dataLake",
    items: [
      { to: "/admin/datalake/courtcases", labelKey: "admin.nav.courtCases", icon: Gavel, canAccess: hasNgmWriteAccess },
      { to: "/admin/datalake/materials", labelKey: "admin.nav.materials", icon: ScrollText, canAccess: hasNgmWriteAccess },
    ],
  },
  {
    headingKey: "admin.nav.casesGroup",
    items: [
      { to: "/admin/jawafdehi/cases", labelKey: "admin.nav.cases", icon: FileText },
    ],
  },
  {
    headingKey: "admin.nav.casework",
    items: [
      { to: "/admin/reviews", labelKey: "admin.nav.reviews", icon: ClipboardCheck },
      { to: "/admin/rules", labelKey: "admin.nav.rules", icon: ScrollText },
      {
        to: "/admin/moderation",
        labelKey: "admin.nav.moderation",
        icon: ShieldCheck,
        // v3: privileged casework action → the single content-staff role
        // (or superuser). Use the shared helper so it stays in sync with
        // lib/roles and admits a group-less superuser via the is_admin flag.
        canAccess: isModerator,
      },
    ],
  },
];

// `onNavigate` lets the mobile drawer close itself when a link is followed.
function Sidebar({
  roles,
  isAdmin,
  onNavigate,
}: {
  roles: string[];
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const lower = roles.map((r) => r.toLowerCase());
  return (
    <nav className="flex flex-col gap-5 p-4">
      {NAV.map((group) => {
        const visible = group.items.filter((it) => {
          // A superuser has an empty `roles` array in v3, so bypass the static
          // `roles` allow-list for admins (else a role-gated item hides from them).
          if (it.roles && !isAdmin && !it.roles.some((r) => lower.includes(r.toLowerCase())))
            return false;
          if (it.canAccess && !it.canAccess(roles, isAdmin)) return false;
          return true;
        });
        if (!visible.length) return null;
        return (
          <div key={group.headingKey} className="space-y-1">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t(group.headingKey)}
            </p>
            {visible.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-slate-100"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(it.labelKey)}
                </NavLink>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

// Shell wrapper. Used directly by AdminLayout (route element) — the page body
// renders through <Outlet/>.
function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, logout, isAdmin } = useCaseworkAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // Mobile nav drawer. Closes on any route change so following a link inside it
  // returns to the page (belt-and-braces with the per-link onNavigate).
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {t("admin.common.loading")}
      </div>
    );
  }

  // Auth guard.
  if (!user) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
    );
  }

  // Role gate. Admins are superusers with NO group in v3, so admit them via the
  // is_admin flag (their `roles` list is empty).
  const roles = user.roles ?? [];
  if (!hasAdminAccess(roles, isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-bold text-slate-900">
            {t("admin.shell.noAccessTitle")}
          </h1>
          <p className="text-sm text-slate-600">
            {t("admin.shell.noAccessBody", { username: user.username })}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              navigate("/admin/login");
            }}
          >
            <LogOut className="mr-1 h-4 w-4" /> {t("admin.common.signOut")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            {/* Hamburger — mobile only; opens the nav drawer. The desktop
                sidebar (md+) makes this redundant, so it's hidden there. */}
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 md:hidden"
              aria-label={t("admin.shell.openNav")}
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("admin.shell.title")}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.username}
              {roles.length ? (
                <span className="ml-1 text-xs text-slate-400">
                  ({roles.join(", ")})
                </span>
              ) : null}
            </span>
            <LanguageToggle quiet />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate("/admin/login");
              }}
            >
              <LogOut className="mr-1 h-4 w-4" /> {t("admin.common.signOut")}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer — renders the same Sidebar; closes on navigation. */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="px-4 pt-4 text-sm font-semibold text-muted-foreground">
            {user.username}
            {roles.length ? (
              <span className="ml-1 text-xs font-normal text-slate-400">
                ({roles.join(", ")})
              </span>
            ) : null}
          </SheetTitle>
          <Sidebar roles={roles} isAdmin={isAdmin} onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r bg-white md:block">
          <Sidebar roles={roles} isAdmin={isAdmin} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
