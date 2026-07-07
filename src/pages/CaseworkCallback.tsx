import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";

const CaseworkCallback = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  // Captured once: react-oidc-context strips ?code after processing, so we can't
  // re-read it on later renders. Distinguishes "mid sign-in" from a stray visit.
  const [hadAuthParams] = useState(() =>
    new URLSearchParams(window.location.search).has("code"),
  );

  useEffect(() => {
    if (auth.isLoading) return;
    if (auth.isAuthenticated) {
      // Return to the pre-login path saved in the OIDC `state`, but never back to
      // the login/callback pages themselves — fall back to the portal home.
      const saved = typeof auth.user?.state === "string" ? auth.user.state : "";
      const dest =
        saved &&
        !saved.startsWith("/admin/login") &&
        !saved.startsWith("/admin/callback")
          ? saved
          : "/admin/reviews";
      navigate(dest, { replace: true });
    } else if (auth.error || !hadAuthParams) {
      // A real sign-in failure, or a stray visit with no pending sign-in. Don't
      // bounce during the brief window where the sign-in is still settling.
      navigate("/admin/login", { replace: true });
    }
  }, [
    auth.isLoading,
    auth.isAuthenticated,
    auth.error,
    auth.user?.state,
    hadAuthParams,
    navigate,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-slate-600">
            {auth.error ? "Sign-in failed. Redirecting…" : "Signing you in…"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CaseworkCallback;
