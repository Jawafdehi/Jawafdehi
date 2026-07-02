import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCaseworkAuth } from "@/context/CaseworkAuthContext";
import { FormError } from "@/components/admin/FormError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Loader2 } from "lucide-react";

const CaseworkLogin = () => {
  const { login, loading, error, user, devAuthEnabled, devLogin } =
    useCaseworkAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [devError, setDevError] = useState<string | null>(null);
  const [devBusy, setDevBusy] = useState(false);

  // Already signed in (e.g. landed here after the OIDC round-trip) — go inside.
  useEffect(() => {
    if (user) navigate("/admin", { replace: true });
  }, [user, navigate]);

  const handleSignIn = () => {
    login();
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevError(null);
    setDevBusy(true);
    try {
      await devLogin(username.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      setDevError(
        status === 401
          ? "Invalid username or password."
          : "Login failed. Is the backend running with DEV_AUTH?",
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
          <h1 className="text-2xl font-bold text-slate-900">Casework Portal</h1>
        </div>

        <div className="space-y-4">
          <FormError message={error} />

          <Button
            onClick={handleSignIn}
            variant="default"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Login with Jawafdehi Auth"}
          </Button>

          {/* DEV-ONLY: username/password form, shown only when VITE_DEV_AUTH is
              set. Uses the SAME credentials as the Django admin. Hidden entirely
              in production builds, where auth is SSO-only. */}
          {devAuthEnabled && (
            <>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  Dev login
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleDevLogin} className="space-y-3">
                <FormError message={devError} />
                <div className="space-y-1">
                  <Label htmlFor="dev-username" className="text-xs">
                    Username
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
                    Password
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
                  Sign in with username &amp; password
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  Dev only — same credentials as the Django admin.
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
