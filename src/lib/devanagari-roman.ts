/**
 * Matching Devanagari text against a query typed on a Latin keyboard.
 *
 * Nearly every caption in this archive is Nepali, and most people reaching for
 * one of 145 tables type the sound, not the script: `badhi` for बढी, `ujuri`
 * for उजुरी. A plain substring filter answers "no matches" to both, which
 * reads as "the archive does not have it".
 *
 * The approach is to ROMANISE THE TEXT and match Latin against Latin, rather
 * than transliterate the query into Devanagari. Romanising is a one-way walk
 * over a known alphabet; going the other way has to guess which of ड/ढ/द/ध a
 * typed `d` meant, and guessing wrong silently hides a row.
 *
 * This is a search aid, not a transliteration scheme. It is deliberately
 * LOSSY — see `fold` — because a reader typing from memory will not reproduce
 * aspirates or vowel length, and a filter that demands them is a filter that
 * answers "nothing" to a correct guess. Nothing here is ever displayed.
 */

/** Independent vowels, which carry their whole sound. */
const VOWELS: Record<string, string> = {
  अ: "a", आ: "aa", इ: "i", ई: "ii", उ: "u", ऊ: "uu",
  ऋ: "ri", ॠ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au",
};

/** Vowel signs, which REPLACE a consonant's inherent `a`. */
const MATRAS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ii", "ु": "u", "ू": "uu",
  "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
};

/** Consonants, WITHOUT the inherent `a` — the walk adds it when it survives. */
const CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "ng",
  च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "ny",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n",
  त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m",
  य: "y", र: "r", ल: "l", व: "w", श: "sh", ष: "sh",
  स: "s", ह: "h", क्ष: "ksh", त्र: "tr", ज्ञ: "gy",
  // Nukta forms, which the corpus uses for loanwords.
  क़: "k", ख़: "kh", ग़: "g", ज़: "z", ड़: "r", ढ़: "rh", फ़: "f", य़: "y",
};

const HALANT = "्";
const ANUSVARA = "ं";
const CHANDRABINDU = "ँ";
const VISARGA = "ः";
const NUKTA = "़";

const DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

/**
 * Devanagari → Latin, roughly as a Nepali speaker would type it.
 *
 * Characters outside the script pass through untouched, so a mixed caption
 * ("आ.व. 2081/82 को विवरण") romanises without losing the part already in Latin.
 */
export function romanize(text: string): string {
  let out = "";

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === NUKTA) continue;
    if (ch === ANUSVARA || ch === CHANDRABINDU) {
      out += "n";
      continue;
    }
    if (ch === VISARGA) {
      out += "h";
      continue;
    }
    if (DIGITS[ch]) {
      out += DIGITS[ch];
      continue;
    }
    if (VOWELS[ch]) {
      out += VOWELS[ch];
      continue;
    }
    if (MATRAS[ch]) {
      // A matra with no consonant before it is malformed input; emit the vowel
      // rather than dropping a character the reader can see.
      out += MATRAS[ch];
      continue;
    }

    const consonant = CONSONANTS[ch];
    if (consonant === undefined) {
      out += ch;
      continue;
    }

    out += consonant;

    // The inherent `a` survives unless the next sign replaces or kills it.
    const next = text[i + 1];
    if (next === HALANT) {
      i += 1;
    } else if (next !== undefined && MATRAS[next] !== undefined) {
      out += MATRAS[next];
      i += 1;
    } else {
      out += "a";
    }
  }

  return out;
}

/**
 * Collapse a romanisation to what a reader typing from memory will produce.
 *
 * Four reductions, each for a mistake that is near-universal rather than
 * careless:
 *
 *   * **aspirates** — `bh`→`b`, `dh`→`d`. Almost nobody types the `h`, and
 *     बढी is `badhii` while the query is `badhi` or `badi`.
 *   * **vowel length** — `aa`→`a`, `ii`→`i`, `uu`→`u`. Nepali distinguishes
 *     these; Latin keyboards and habit do not.
 *   * **retroflex/dental and sibilants** already merge above (ट and त both
 *     `t`, श and ष both `sh`), which is why they are not listed here.
 *   * **everything non-alphanumeric** — spacing and punctuation differ between
 *     a caption and what anyone types.
 *
 * Over-matching is the intended failure mode. On a list of 145 this shows a
 * reader a few extra rows; under-matching hides the row they came for.
 */
export function fold(roman: string): string {
  return roman
    .toLowerCase()
    .replace(/([bcdgjkpt])h/g, "$1")
    .replace(/([aeiou])\1+/g, "$1")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/[^a-z0-9]+/g, "");
}

/** The form both sides of a comparison are reduced to. */
export function searchKey(text: string): string {
  return fold(romanize(text));
}

/**
 * Does `text` match `query`, in script or in sound?
 *
 * Tries the literal substring first so a Devanagari query, or an English one
 * against an English caption, behaves exactly as before and costs nothing
 * extra. Only then does it fall back to the folded romanisation.
 */
export function matchesRomanized(text: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (text.toLowerCase().includes(q.toLowerCase())) return true;

  const key = searchKey(q);
  if (!key) return false;
  return searchKey(text).includes(key);
}
