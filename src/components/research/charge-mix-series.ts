// SPDX-License-Identifier: Hippocratic-3.0
import type { ChargeMixYear } from "@/data/research-corruption";

// Extracted from ChargeMixByYear.tsx so that the eager wrapper (legend, toggle,
// aria-label) and the lazily-loaded recharts body can share them without either
// importing the other — a parent<->child cycle would work in ESM but would also
// drag recharts back into the wrapper's chunk, which is the whole point of the
// split. Nothing here imports recharts.
export type MixKey = "bribery" | "fake" | "embezzlement" | "benefit" | "loss" | "other";

// Fixed categorical order + colours (validated CVD-safe set; `other` is neutral).
// Fake-credential is crimson so the eye tracks the family whose share collapses.
export const SERIES: readonly { key: MixKey; color: string }[] = [
  { key: "bribery", color: "#2a78d6" },
  // The only brand colour in this set, so it reads the token rather than a
  // literal — the other five belong to this palette alone and are not brand.
  { key: "fake", color: "hsl(var(--accent))" },
  { key: "embezzlement", color: "#1baf7a" },
  { key: "benefit", color: "#4a3aa7" },
  { key: "loss", color: "#eda100" },
  { key: "other", color: "hsl(var(--muted-foreground))" },
];

export const rowTotal = (d: ChargeMixYear) =>
  d.bribery + d.fake + d.embezzlement + d.benefit + d.loss + d.other;
