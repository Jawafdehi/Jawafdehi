import CaseworkLayout from "@/components/CaseworkLayout";

export default function CaseworkHow() {
  return (
    <CaseworkLayout>
      <div className="max-w-2xl space-y-4 text-sm text-foreground">
        <h1 className="text-xl font-bold text-foreground">How the review works</h1>
        <p>
          The Casework Review System scores the quality of a Jawafdehi case the way a careful
          editor would, but consistently and in about 20 seconds.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <span className="font-medium">Pull the case.</span> You submit a case slug. The system
            loads the case and its sources from the local Jawafdehi database (seeded from the live
            server), so reviews run fully offline.
          </li>
          <li>
            <span className="font-medium">Convert the sources.</span> Each source document (often a
            scanned Nepali PDF) is converted to plain markdown with <code>likhit</code> so the judge
            can actually read it.
          </li>
          <li>
            <span className="font-medium">Detect the case type.</span> Cases fall into four families
            — CIAA basic, CIAA extended (charge sheet), CIAA with verdict, and non-CIAA — and each
            family has its own quality bar.
          </li>
          <li>
            <span className="font-medium">Score against the rules.</span> Every applicable rule is
            scored. Deterministic rules are exact checks (e.g. "is there a court case number?").
            LLM rules are graded by AWS Bedrock (Claude Opus 4.8), sampled several times so we can
            report a confidence (mean ± variance) per rule.
          </li>
          <li>
            <span className="font-medium">Roll up &amp; decide.</span> Rule scores roll up into
            per-category scores (shown as a radar chart) and a weighted overall. Hard "gate" rules
            can force a REJECT. The disposition is PASS, REVISE, or REJECT.
          </li>
        </ol>
        <p className="text-muted-foreground">
          Reviewers can edit the rules and thresholds on the <span className="font-medium">Rules</span>{" "}
          tab — the bar is whatever the team decides it is.
        </p>
      </div>
    </CaseworkLayout>
  );
}
