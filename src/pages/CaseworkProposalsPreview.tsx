// PROTOTYPE preview — mock-data version of the proposal queue, mounted at the
// dev-only /dev/proposals route so the UI can be exercised with zero backend.
// The real, API-backed page is CaseworkProposals.tsx (/admin/proposals).
import { useState } from "react";
import ProposalQueue from "@/components/casework/ProposalQueue";
import { MOCK_PROPOSALS } from "@/data/proposals-mock";
import type { CaseUpdateProposal } from "@/types/proposals";
import { intentLabel } from "@/lib/proposal-ui";
import { toast } from "@/hooks/use-toast";

export default function CaseworkProposalsPreview() {
  const [proposals, setProposals] = useState<CaseUpdateProposal[]>(MOCK_PROPOSALS);

  const onDecision = (id: string, decision: "approved" | "rejected", notes: string) => {
    let touched: CaseUpdateProposal | undefined;
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        touched = p;
        return {
          ...p,
          status: decision,
          review: { reviewer: "caseworker:you", reviewed_at: new Date().toISOString(), notes },
        };
      }),
    );
    if (touched) {
      toast({
        title: decision === "approved" ? "Proposal approved" : "Proposal rejected",
        description:
          decision === "approved"
            ? `${intentLabel(touched.intent.type)} applied to “${touched.case_title}”.`
            : `Dismissed on “${touched.case_title}”. It won't be re-proposed (dedup).`,
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Prototype preview — mock data, no backend. The live page is /admin/proposals.
      </div>
      <ProposalQueue proposals={proposals} onDecision={onDecision} />
    </div>
  );
}
