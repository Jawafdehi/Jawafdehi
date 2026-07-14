import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CaseworkLayout from "@/components/CaseworkLayout";
import { getReview } from "@/services/casework-api";
import { Loader2 } from "lucide-react";

// Legacy per-run URL (/admin/reviews/:id). The per-case page now HOSTS run
// details, so there is no standalone run page — resolve the run's case slug and
// redirect to /admin/reviews/case/:slug?run=:id (replace, so Back doesn't bounce
// through here). Keeps old bookmarks / deep links working.
export default function CaseworkRunRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate("/admin/reviews", { replace: true });
      return;
    }
    let active = true;
    getReview(Number(id))
      .then((r) => {
        if (active)
          navigate(`/admin/reviews/case/${encodeURIComponent(r.slug)}?run=${r.id}`, {
            replace: true,
          });
      })
      .catch(() => {
        if (active) navigate("/admin/reviews", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [id, navigate]);

  return (
    <CaseworkLayout>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening review…
      </div>
    </CaseworkLayout>
  );
}
