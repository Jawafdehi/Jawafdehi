// Caseworker "update proposals" review queue — the live, API-backed page at
// /admin/proposals. Lists CaseUpdateProposals from the monolith; approve/reject
// call the backend actions (approve applies the intent onto the case).
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import CaseworkLayout from "@/components/CaseworkLayout";
import ProposalQueue from "@/components/casework/ProposalQueue";
import {
  approveProposal,
  listProposals,
  proposalErrorMessage,
  rejectProposal,
} from "@/services/proposals-api";
import type { CaseUpdateProposal } from "@/types/proposals";
import { intentLabel } from "@/lib/proposal-ui";
import { toast } from "@/hooks/use-toast";

export default function CaseworkProposals() {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<CaseUpdateProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setProposals(await listProposals());
      setErr("");
    } catch (e) {
      setErr(proposalErrorMessage(e, t("admin.proposals.loadFailed", "Failed to load proposals.")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Returns the promise so ProposalQueue can keep the buttons disabled until the
  // write settles — approve/reject are not idempotent.
  const onDecision = async (id: string, decision: "approved" | "rejected", notes: string) => {
    const touched = proposals.find((p) => p.id === id);
    try {
      const updated =
        decision === "approved"
          ? await approveProposal(id, notes)
          : await rejectProposal(id, notes);
      setProposals((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast({
        title:
          decision === "approved"
            ? t("admin.proposals.approvedToast", "Proposal approved")
            : t("admin.proposals.rejectedToast", "Proposal rejected"),
        description: touched
          ? t("admin.proposals.toastDetail", {
              defaultValue: "{{intent}} on “{{title}}”.",
              intent: intentLabel(touched.intent.type, t),
              title: touched.case_title,
            })
          : "",
      });
    } catch (e) {
      toast({
        title: t("admin.proposals.actionFailed", "Action failed"),
        description: proposalErrorMessage(
          e,
          t("admin.proposals.actionFailedBody", "Could not update the proposal."),
        ),
      });
    }
  };

  return (
    <CaseworkLayout>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("admin.proposals.loading", "Loading proposals…")}
        </div>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : (
        <ProposalQueue proposals={proposals} onDecision={onDecision} />
      )}
    </CaseworkLayout>
  );
}
