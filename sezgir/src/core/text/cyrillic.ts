// Uzbek, Latin to Cyrillic — what Sezgir types when the user wants Cyrillic.
//
// PURE. No Electron, no Node builtins, no OS.
//
// The engine and every step after it (normaliser, capitaliser, modes, guards) work in the
// official Latin alphabet; this runs LAST, on the exact text about to be typed. That keeps
// the measured pipeline untouched and makes Cyrillic a spelling of the same words rather
// than a second pipeline that could drift from the first.
//
// The rules are the 1995 alphabet's correspondence, read left to right:
//
//   oʻ → ў   gʻ → ғ   sh → ш   ch → ч   ng → нг   yo → ё   yu → ю   ya → я   ye → е
//   e → э at the start of a word and after a vowel, е elsewhere
//   ʼ (tutuq belgisi, between letters) → ъ           q → қ   h → ҳ   x → х   j → ж
//
// Two traps a naive table falls into, both pinned by tests:
//
//   * `yoʻl` is йўл, not ёʻл — `y` before `oʻ` is й, because `oʻ` is one letter.
//   * `sʼh` (Isʼhoq) is сҳ — the apostrophe there separates s from h and is not a ъ.
//
// What cannot come back: ц and ь in Russian loanwords (Latin writes `sirk`, `aprel`), so
// those are spelled as written. Web addresses and e-mail addresses are left alone.

import type { UzbekScript } from '../../contracts/index.js';

/** Everything an Uzbek writer types as okina or tutuq: ʻ ʼ ' ‘ ’ ` ´ ʿ. */
const APOSTROPHES = new Set(['ʻ', 'ʼ', "'", '‘', '’', '`', '´', 'ʿ']);

const SINGLE: Readonly<Record<string, string>> = {
  a: 'а', b: 'б', c: 'с', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й',
  z: 'з',
};

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function isLatinLetter(ch: string | undefined): boolean {
  return ch !== undefined && /^[A-Za-z]$/u.test(ch);
}

function isLetter(ch: string | undefined): boolean {
  return ch !== undefined && /^\p{L}$/u.test(ch);
}

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
}

/**
 * Case for a letter that came from one or two Latin ones: `Sh` and `SH` are both Ш, and an
 * all-caps word stays all caps (`SHAHAR` → `ШАҲАР`).
 */
function cased(cyrillic: string, first: string): string {
  return isUpper(first) ? cyrillic.toUpperCase() : cyrillic;
}

/** Is the apostrophe at `index` the okina of oʻ / gʻ? */
function isOkinaAt(chars: readonly string[], index: number): boolean {
  const mark = chars[index];
  if (mark === undefined || !APOSTROPHES.has(mark)) return false;
  const before = chars[index - 1]?.toLowerCase();
  if (before !== 'o' && before !== 'g') return false;
  // U+02BB is the okina by definition; a look-alike counts when a letter follows (oʻzbek, gʻisht)
  // or the word ends there (boʻ), but not when it is a closing quote after a word ending in o.
  return mark === 'ʻ' || isLetter(chars[index + 1]) || chars[index + 1] === undefined || /\s/u.test(chars[index + 1] ?? '');
}

/** Web and e-mail addresses are typed as said. */
const ADDRESS = /(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S+|\S+@\S+\.\S+/giu;

function transliterateRun(text: string): string {
  const chars = [...text];
  let out = '';
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] as string;
    const lower = ch.toLowerCase();
    const next = chars[i + 1];
    const nextLower = next?.toLowerCase();
    const previous = chars[i - 1];

    if (!isLatinLetter(ch)) {
      if (APOSTROPHES.has(ch)) {
        // The okina has already been folded into ў / ғ below; anything reaching here is
        // either the tutuq belgisi between two letters or plain punctuation.
        if (isLetter(previous) && isLetter(next)) {
          // sʼh separates s from h and has no Cyrillic letter of its own (Isʼhoq → Исҳоқ).
          if (previous?.toLowerCase() === 's' && nextLower === 'h') continue;
          out += isUpper(previous ?? '') && isUpper(next ?? '') ? 'Ъ' : 'ъ';
          continue;
        }
      }
      out += ch;
      continue;
    }

    // oʻ → ў, gʻ → ғ
    if ((lower === 'o' || lower === 'g') && isOkinaAt(chars, i + 1)) {
      out += cased(lower === 'o' ? 'ў' : 'ғ', ch);
      i += 1;
      continue;
    }
    // sh, ch
    if ((lower === 's' || lower === 'c') && nextLower === 'h') {
      out += cased(lower === 's' ? 'ш' : 'ч', ch);
      i += 1;
      continue;
    }
    // yo, yu, ya, ye — but y before the letter oʻ is й (yoʻl → йўл).
    if (lower === 'y' && (nextLower === 'o' || nextLower === 'u' || nextLower === 'a' || nextLower === 'e')) {
      if (nextLower === 'o' && isOkinaAt(chars, i + 2)) {
        out += cased('й', ch);
        continue;
      }
      const iotated = { o: 'ё', u: 'ю', a: 'я', e: 'е' }[nextLower] as string;
      // An all-caps word keeps the second letter's case: YO → Ё either way.
      out += cased(iotated, ch);
      i += 1;
      continue;
    }
    // e → э at the start of a word and after a vowel
    if (lower === 'e') {
      const before = previous?.toLowerCase();
      const wordStart = !isLetter(previous) && !(previous !== undefined && APOSTROPHES.has(previous) && isLetter(chars[i - 2]));
      const afterVowel = before !== undefined && VOWELS.has(before);
      out += cased(wordStart || afterVowel ? 'э' : 'е', ch);
      continue;
    }

    out += cased(SINGLE[lower] ?? ch, ch);
  }
  return out;
}

/**
 * The Cyrillic spelling of Uzbek Latin text. Characters that are not Latin letters
 * (digits, punctuation, Cyrillic already, emoji) pass through unchanged.
 */
export function uzbekLatinToCyrillic(text: string): string {
  let out = '';
  let last = 0;
  for (const match of text.matchAll(ADDRESS)) {
    const start = match.index;
    out += transliterateRun(text.slice(last, start)) + match[0];
    last = start + match[0].length;
  }
  return out + transliterateRun(text.slice(last));
}

/** The other alphabet — what holding Shift with the dictation key asks for. */
export function otherScript(script: UzbekScript): UzbekScript {
  return script === 'latin' ? 'cyrillic' : 'latin';
}

/** `text` spelled in `script`. Only Uzbek is respelled; every other language is typed as is. */
export function inUzbekScript(text: string, language: string, script: UzbekScript): string {
  return language === 'uz' && script === 'cyrillic' ? uzbekLatinToCyrillic(text) : text;
}
