// The Deepak Bhatta series as the bigo-total API (JawafdehiAPI feat/series-bigo-total)
// serves it: banking, securities and insurance sit inside 0154's claim; 0179 is
// additional. Built from the v1 fixture so the two can't drift.
import type { SeriesDetail } from "@/types/series";

const MAIN = "case-082-cr-0154-deepak-bhatta";

export const OVERLAP_REASONS: Record<string, string> = {
  "deepak-bhatta-banking-offence-patan-hc-082-cb-0048":
    "सम्पत्ति शुद्धीकरण मुद्दा (082-CR-0154) को अभियोगपत्रले यो कर्जा दुरुपयोगको रु. ४२ करोड १४ लाख आफ्नो बिगोमा समावेश गरेको छ।",
  "cib-463":
    "सम्पत्ति शुद्धीकरण मुद्दा (082-CR-0154) को अभियोगपत्रले नेपाल रिको सेयर मूल्यमा हेरफेर गरी धितोपत्र कसुरबाट आर्जित रु. १७.४८ अर्ब आफ्नो बिगोमा समावेश गरेको छ।",
  "himalayan-re-insurance-offence-kdc-082-c2-0088":
    "सम्पत्ति शुद्धीकरण मुद्दा (082-CR-0154) को अभियोगपत्रले बीमा ऐनअन्तर्गतको कसुरबाट प्राप्त बीमकको कोषको रु. ३.८१ अर्ब आफ्नो बिगोमा समावेश गरेको छ।",
};

export function withBigoTotal(series: SeriesDetail): SeriesDetail {
  const members = series.members.map((member) => {
    const reason = OVERLAP_REASONS[member.case.slug];
    return {
      ...member,
      bigo_overlaps: reason ? { member_slug: MAIN, reason: { ne: reason, en: null } } : null,
    };
  });
  const summed = members.filter((m) => !m.bigo_overlaps && m.case.bigo != null);
  return {
    ...series,
    members,
    totals: {
      ...series.totals,
      bigo_total: summed.reduce((sum, m) => sum + (m.case.bigo ?? 0), 0),
      bigo_total_members: summed.length,
      bigo_overlapping_members: members.length - summed.length,
    },
  };
}
