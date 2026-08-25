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
// The five series values live in --chart-1..5 rather than as literals here, so
// the dark theme can restate them; --chart-2 is the brand crimson.
export const SERIES: readonly { key: MixKey; color: string }[] = [
  { key: "bribery", color: "hsl(var(--chart-1))" },
  { key: "fake", color: "hsl(var(--chart-2))" },
  { key: "embezzlement", color: "hsl(var(--chart-3))" },
  { key: "benefit", color: "hsl(var(--chart-4))" },
  { key: "loss", color: "hsl(var(--chart-5))" },
  { key: "other", color: "hsl(var(--muted-foreground))" },
];

export const rowTotal = (d: ChargeMixYear) =>
  d.bribery + d.fake + d.embezzlement + d.benefit + d.loss + d.other;
