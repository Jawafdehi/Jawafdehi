import ArchiveSearch from "./ArchiveSearch";

// Data-lake governance materials browse page — a single-type view of the unified
// archive search (faceted, sorted, bilingual), pinned to the `material` type.
export default function Materials() {
  return (
    <ArchiveSearch
      lockedType="material"
      heading="Governance materials"
      description="Browse public-domain government documents and records in the Jawafdehi governance archive — development projects, agency publications, and official materials."
      canonicalPath="/materials"
    />
  );
}
