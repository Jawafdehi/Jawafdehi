import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { FormError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Loader2 } from "lucide-react";

const CaseworkLogin = () => {
  const { login, loading, error, user, devAuthEnabled, devLogin } =
    useCaseworkAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // The page the user tried to reach before the auth gate bounced them here
  // (AdminShell sets `state.from`). Default to the dashboard, never back to a
  // login/callback page. This becomes the OIDC `state` so the callback can
  // return the user to where they started.
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const returnTo =
    rawFrom &&
    !rawFrom.startsWith("/admin/login") &&
    !rawFrom.startsWith("/admin/callback")
      ? rawFrom
      : "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [devError, setDevError] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState(false);

  // Already signed in (e.g. landed here after the OIDC round-trip) — go inside.
  useEffect(() => {
    if (user) navigate(returnTo, { replace: true });
  }, [user, navigate, returnTo]);

  const handleSignIn = () => {
    login(returnTo);
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevError(null);
    setDevBusy(true);
    try {
      await devLogin(username.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      setDevError(
        status === 401
          ? t("admin.login.invalidCredentials")
          : t("admin.login.loginFailed"),
      );
    } finally {
      setDevBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("admin.login.title")}
          </h1>
        </div>

        <div className="space-y-4">
          <FormError message={error} />

          <Button
            onClick={handleSignIn}
            variant="default"
            className="w-full"
            disabled={loading}
          >
            {loading ? t("admin.login.signingIn") : t("admin.login.ssoButton")}
          </Button>

          {/* DEV-ONLY: username/password form, shown only when VITE_DEV_AUTH is
              set. Uses the SAME credentials as the Django admin. Hidden entirely
              in production builds, where auth is SSO-only. */}
          {devAuthEnabled && (
            <>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {t("admin.login.devDivider")}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleDevLogin} className="space-y-3">
                <FormError message={devError} />
                <div className="space-y-1">
                  <Label htmlFor="dev-username" className="text-xs">
                    {t("admin.login.username")}
                  </Label>
                  <Input
                    id="dev-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="admin"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dev-password" className="text-xs">
                    {t("admin.login.password")}
                  </Label>
                  <Input
                    id="dev-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••"
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={devBusy || !username.trim() || !password}
                >
                  {devBusy ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("admin.login.devSubmit")}
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  {t("admin.login.devNote")}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseworkLogin;
