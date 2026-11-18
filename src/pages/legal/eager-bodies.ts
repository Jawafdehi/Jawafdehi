// Statically imported legal texts, for the server build and tests only. The
// client must never import this module: see ./bodies.ts.
import { PrivacyEn } from "./PrivacyEn";
import { PrivacyNe } from "./PrivacyNe";
import { TermsEn } from "./TermsEn";
import { TermsNe } from "./TermsNe";

export const EAGER_LEGAL_BODIES = { PrivacyEn, PrivacyNe, TermsEn, TermsNe };
