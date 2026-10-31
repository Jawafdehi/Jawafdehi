/**
 * Supporters shown on the donate page's community wall.
 *
 * Everything on this list is published: a photo where there is one, and the
 * person's full name where there is not. Both are personal data under the
 * Individual Privacy Act 2075, and this is an anti-corruption site, so nobody
 * belongs here without having agreed to appear. `photo` is optional; that
 * agreement is not.
 *
 * An earlier revision rendered initials for anyone without a photo, and this
 * comment still described that when the names went in. It was wrong for a
 * whole review cycle. Initials were dropped on request — "SM" identifies
 * nobody and reads as a placeholder, which is the opposite of what a wall of
 * supporters is for — and the privacy trade-off moved with them. A name is no
 * longer the quiet option here, so adding an entry is a disclosure decision
 * rather than a formatting one.
 *
 * This list is deliberately NOT derived from `team.ts`. Funding the archive and
 * serving on the board are separate facts, and joining or leaving one should
 * never silently change the other.
 *
 * Order is editorial: the entries without photos are spread through the list so
 * the wall does not read as a block of faces followed by a row of leftovers.
 */
export interface Donor {
  /** Full name. Rendered in the cell when there is no photo, and the photo's
   *  alt text when there is. Public either way. */
  name: string;
  /** Path under `/assets`. Its absence changes how the entry renders, not
   *  whether that person agreed to be listed. */
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
