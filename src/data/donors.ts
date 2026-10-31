/**
 * Supporters shown on the donate page's community wall.
 *
 * A photo and a full name are personal data under the Individual Privacy Act
 * 2075, and this is an anti-corruption site, so an entry earns a `photo` only
 * once that person's opt-in is on file. Everyone else appears as their initials,
 * which is what someone who wants to be counted but not identified should get.
 *
 * This list is deliberately NOT derived from `team.ts`. Funding the archive and
 * serving on the board are separate facts, and joining or leaving one should
 * never silently change the other.
 *
 * Order is editorial: the entries without photos are spread through the list so
 * the wall does not read as a block of faces followed by a row of leftovers.
 */
export interface Donor {
  /** Full name. Read by assistive tech; the wall shows a photo or initials. */
  name: string;
  /** Path under `/assets`, set only for those who opted in to a photo. */
  photo?: string;
}

export const donors: readonly Donor[] = [
  { name: "Damodar Dahal", photo: "/assets/teammembers/damodar.webp" },
  { name: "Medha Sharma", photo: "/assets/teammembers/medha.webp" },
  { name: "Subash Mishra" },
  { name: "Bishwas Gautam", photo: "/assets/teammembers/bishwas.webp" },
  { name: "Rohan Raj Gautam", photo: "/assets/teammembers/rohan.webp" },
  { name: "Sundar Gautam" },
  { name: "Nischal Dahal", photo: "/assets/teammembers/nischal.webp" },
  { name: "Shikshita Bhandari", photo: "/assets/teammembers/shikshita.webp" },
  { name: "Bimal Kunwor" },
  { name: "Anish Karki", photo: "/assets/teammembers/anish.webp" },
];
