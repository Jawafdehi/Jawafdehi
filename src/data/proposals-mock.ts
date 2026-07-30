// PROTOTYPE mock data — 10 varied CaseUpdateProposals for the review-queue UI.
// Fabricated for the design; defendants referenced by opaque entity id, not name.
// Mirrors work/2026-07-27-case-enrichment-events/PROPOSAL-EXAMPLES.md.

import type { CaseUpdateProposal } from "@/types/proposals";

const LALITA = {
  case: "https://jawafdehi.org/api/cases/lalita-niwas-land-scam",
  case_title: "Lalita Niwas land scam",
  case_slug: "lalita-niwas-land-scam",
};
const WIDEBODY = {
  case: "https://jawafdehi.org/api/cases/wide-body-aircraft-procurement",
  case_title: "Wide-body aircraft procurement",
  case_slug: "wide-body-aircraft-procurement",
};

export const MOCK_PROPOSALS: CaseUpdateProposal[] = [
  {
    id: "cup_01J8HEARING",
    ...LALITA,
    source_kind: "ngm_docket",
    intent: {
      type: "append_timeline_entry",
      entry: {
        date: "2026-08-12",
        date_bs: "2083-04-28",
        title: "Special Court hearing scheduled",
        description: "Next hearing listed on docket 082-CR-0154 (Special Court).",
      },
    },
    confidence: 0.97,
    status: "superseded",
    provenance: {
      source: "https://jawafdehi.org/api/court-cases/specialcourt.082-cr-0154",
      detected_by: "consumer:proposal-builder",
      dedup_key: "docket:specialcourt.082-cr-0154:hearing:2083-04-28",
    },
    origin_event: {
      subject: "jaw.case.update.proposed",
      msg_id: "sig-9f2a1c",
      subject_refs: [LALITA.case, "https://jawafdehi.org/api/court-cases/specialcourt.082-cr-0154"],
    },
    review: { reviewer: null, reviewed_at: null, notes: "" },
    created_at: "2026-07-27T03:31:00Z",
  },
  {
    id: "cup_01J8VERDICT",
    ...WIDEBODY,
    source_kind: "ngm_docket",
    intent: {
      type: "append_timeline_entry",
      entry: {
        date: "2026-07-24",
        date_bs: "2083-04-09",
        title: "Special Court verdict — principal defendant convicted",
        description:
          "Court convicted the principal defendant (entity nes/person/def-3f2a) and ordered recovery of NPR 14.9 crore. Docket 082-CR-0179.",
      },
    },
    confidence: 0.95,
    status: "approved",
    provenance: {
      source: "https://jawafdehi.org/api/court-cases/specialcourt.082-cr-0179",
      detected_by: "consumer:proposal-builder",
      dedup_key: "docket:specialcourt.082-cr-0179:verdict:2083-04-09",
    },
    origin_event: {
      subject: "jaw.case.update.proposed",
      msg_id: "sig-4b7e02",
      subject_refs: [WIDEBODY.case, "https://jawafdehi.org/api/court-cases/specialcourt.082-cr-0179", "nes/person/def-3f2a"],
    },
    review: { reviewer: "caseworker:az", reviewed_at: "2026-07-24T11:10:00Z", notes: "Cross-checked against the order PDF. Approved." },
    created_at: "2026-07-24T04:02:00Z",
  },
  {
    id: "cup_01J8STATUS",
    ...WIDEBODY,
    source_kind: "ngm_docket",
    intent: { type: "set_status", field: "status", from: "sub_judice", to: "verdict_delivered" },
    confidence: 0.9,
    status: "pending",
    provenance: {
      source: "https://jawafdehi.org/api/court-cases/specialcourt.082-cr-0179",
      detected_by: "consumer:proposal-builder",
      dedup_key: "case:wide-body-aircraft-procurement:status:verdict_delivered:2083-04-09",
    },
    origin_event: { subject: "jaw.case.update.proposed", msg_id: "sig-4b7e02", subject_refs: [WIDEBODY.case] },
    review: { reviewer: null, reviewed_at: null, notes: "" },
    created_at: "2026-07-24T04:02:05Z",
  },
  {
    id: "cup_01J8APPEAL",
    ...LALITA,
    source_kind: "ciaa_press",
    intent: {
      type: "append_timeline_entry",
      entry: {
        date: "2026-07-20",
        date_bs: "2083-04-05",
        date_ad_uncertain: true,
        title: "CIAA files appeal at the Supreme Court",
        description:
          "Per CIAA press release, the Commission appealed the Special Court acquittal of two defendants to the Supreme Court.",
      },
    },
    confidence: 0.72,
    status: "pending",
    provenance: {
      source: "https://ciaa.gov.np/pressreleaseCategory/others/2083-04-05-appeal",
      detected_by: "consumer:proposal-builder",
      dedup_key: "ciaa-press:2083-04-05-appeal:case:lalita-niwas-land-scam",
    },
    origin_event: { subject: "jaw.case.update.proposed", msg_id: "sig-77c1aa", subject_refs: [LALITA.case, "nes/org/ciaa"] },
    review: { reviewer: null, reviewed_at: null, notes: "Verify the exact filing date against the gazette." },
    created_at: "2026-07-21T03:40:00Z",
  },
  {
    id: "cup_01J8MATERIAL",
    ...WIDEBODY,
    source_kind: "court_order",
    intent: {
      type: "link_material",
      material: "https://jawafdehi.org/material/court_order/specialcourt.082-cr-0179",
      relation: "court_order",
    },
    confidence: 0.98,
    status: "approved",
    provenance: {
      source: "https://jawafdehi.org/material/court_order/specialcourt.082-cr-0179",
      detected_by: "consumer:proposal-builder",
      dedup_key: "link:wide-body-aircraft-procurement:material:court_order/specialcourt.082-cr-0179",
    },
    origin_event: {
      subject: "jaw.case.update.proposed",
      msg_id: "sig-2ad901",
      subject_refs: [WIDEBODY.case, "https://jawafdehi.org/material/court_order/specialcourt.082-cr-0179"],
    },
    review: { reviewer: "caseworker:az", reviewed_at: "2026-07-24T11:12:00Z", notes: "Same order as the verdict entry. Linked." },
    created_at: "2026-07-24T06:05:00Z",
  },
  {
    id: "cup_01J8NEWS",
    ...LALITA,
    source_kind: "news",
    intent: {
      type: "append_timeline_entry",
      entry: {
        date: "2026-07-26",
        date_bs: "2083-04-11",
        title: "Media: co-accused detained for questioning",
        description:
          "An outlet reports a co-accused (matched: entity nes/person/def-9c1b) was detained. UNVERIFIED — single source, name-based match.",
      },
    },
    confidence: 0.45,
    status: "pending",
    provenance: {
      source: "https://ekantipur.com/news/2026/07/26/some-article-slug",
      detected_by: "consumer:proposal-builder",
      dedup_key: "news:ekantipur:2026-07-26-some-article-slug:case:lalita-niwas-land-scam",
    },
    origin_event: { subject: "jaw.case.update.proposed", msg_id: "sig-e5f6a0", subject_refs: [LALITA.case, "nes/person/def-9c1b"] },
    review: { reviewer: null, reviewed_at: null, notes: "Confirm this is the same person before publishing." },
    created_at: "2026-07-26T14:20:00Z",
  },
  {
    id: "cup_01J8MANUAL",
    ...LALITA,
    source_kind: "caseworker",
    intent: {
      type: "append_timeline_entry",
      entry: {
        date: "2026-07-27",
        date_bs: "2083-04-12",
        title: "Land revenue office confirms plot transfer frozen",
        description:
          "Confirmed directly with the district land revenue office that transfers on the disputed plots are administratively frozen.",
      },
    },
    confidence: 1.0,
    status: "pending",
    provenance: { source: "caseworker", detected_by: "caseworker:az", dedup_key: "manual:az:2026-07-27:land-transfer-frozen" },
    origin_event: { subject: "jaw.case.update.proposed", msg_id: "manual-az-01", subject_refs: [LALITA.case] },
    review: { reviewer: null, reviewed_at: null, notes: "Self-filed; needs a second caseworker to approve." },
    created_at: "2026-07-27T08:15:00Z",
  },
  {
    id: "cup_01J8RAWPATCH",
    ...WIDEBODY,
    source_kind: "court_order",
    intent: {
      type: "raw_patch",
      patch: [
        { op: "add", path: "/related_entities/-", value: "nes/org/aircraft-supplier-xyz" },
        { op: "add", path: "/notes", value: "Supplier entity surfaced in the verdict order; added as related for cross-linking." },
      ],
    },
    confidence: 0.6,
    status: "pending",
    provenance: {
      source: "https://jawafdehi.org/material/court_order/specialcourt.082-cr-0179",
      detected_by: "consumer:proposal-builder",
      dedup_key: "case:wide-body-aircraft-procurement:related:aircraft-supplier-xyz",
    },
    origin_event: { subject: "jaw.case.update.proposed", msg_id: "sig-2ad901", subject_refs: [WIDEBODY.case] },
    review: { reviewer: null, reviewed_at: null, notes: "" },
    created_at: "2026-07-24T06:10:00Z",
  },
  {
    id: "cup_01J8REJECT",
    ...LALITA,
    source_kind: "news",
    intent: {
      type: "append_timeline_entry",
      entry: {
        date: "2026-07-25",
        title: "Media: official transferred amid probe",
        description: "Name-matched to a different official; not this case.",
      },
    },
    confidence: 0.38,
    status: "rejected",
    provenance: {
      source: "https://setopati.com/some-other-article",
      detected_by: "consumer:proposal-builder",
      dedup_key: "news:setopati:some-other-article:case:lalita-niwas-land-scam",
    },
    origin_event: { subject: "jaw.case.update.proposed", msg_id: "sig-b0c9d1", subject_refs: [LALITA.case] },
    review: { reviewer: "caseworker:rn", reviewed_at: "2026-07-25T16:40:00Z", notes: "Homonym — different individual, unrelated ministry. Rejected." },
    created_at: "2026-07-25T15:02:00Z",
  },
  {
    id: "cup_01J8SUPERSEDE",
    ...LALITA,
    source_kind: "ngm_docket",
    intent: {
      type: "append_timeline_entry",
      entry: {
        date: "2026-08-19",
        date_bs: "2083-05-03",
        title: "Special Court hearing scheduled (re-listed)",
        description: "Hearing on docket 082-CR-0154 moved from 2083-04-28 to 2083-05-03.",
      },
    },
    confidence: 0.97,
    status: "pending",
    provenance: {
      source: "https://jawafdehi.org/api/court-cases/specialcourt.082-cr-0154",
      detected_by: "consumer:proposal-builder",
      dedup_key: "docket:specialcourt.082-cr-0154:hearing:2083-05-03",
      supersedes: "cup_01J8HEARING",
    },
    origin_event: {
      subject: "jaw.case.update.proposed",
      msg_id: "sig-9f2a4d",
      subject_refs: [LALITA.case, "https://jawafdehi.org/api/court-cases/specialcourt.082-cr-0154"],
    },
    review: { reviewer: null, reviewed_at: null, notes: "" },
    created_at: "2026-07-28T03:31:00Z",
  },
];
