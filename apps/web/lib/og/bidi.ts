import opentype from '@shuding/opentype.js';
import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

type Font = {
  getAdvanceWidth: (text: string, size: number, options?: { kerning?: boolean }) => number;
};

const parsed = new Map<string, Font>();

export function rememberFont(file: string, data: ArrayBuffer): void {
  parsed.set(file, opentype.parse(data) as Font);
}

export function hasRTL(value: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF]/.test(value);
}

/** UAX #9 token reorder. Satori shapes each word, but it does not reorder words. */
export function visualTokens(text: string): Array<{ t: string; space: boolean }> {
  const base = /^[^A-Za-z\u0590-\u05FF]*[\u0590-\u05FF]/.test(text) ? 'rtl' : 'ltr';
  const { levels } = bidi.getEmbeddingLevels(text, base);
  const toks: Array<{ t: string; lvl: number; space: boolean }> = [];
  const re = /[\p{L}\p{M}\p{N}'’\-]+|\s+|./gu;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    toks.push({ t: match[0], lvl: levels[match.index] ?? 0, space: /^\s+$/.test(match[0]) });
  }
  if (toks.length === 0) return [];
  const max = Math.max(...toks.map((token) => token.lvl));
  const odds = toks.map((token) => token.lvl).filter((level) => level % 2 === 1);
  const minOdd = odds.length ? Math.min(...odds) : 99;
  for (let level = max; level >= minOdd && level > 0; level -= 1) {
    let index = 0;
    while (index < toks.length) {
      const token = toks[index];
      if (token && token.lvl >= level) {
        let end = index;
        while (end < toks.length && (toks[end]?.lvl ?? 0) >= level) end += 1;
        const segment = toks.slice(index, end).reverse();
        toks.splice(index, end - index, ...segment);
        index = end;
      } else {
        index += 1;
      }
    }
  }
  const mirror: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '«': '»', '»': '«' };
  return toks.map((token) => ({
    t: token.lvl % 2 && mirror[token.t] ? mirror[token.t] : token.t,
    space: token.space,
  }));
}

function measure(text: string, file: string, size: number): number {
  const font = parsed.get(file);
  if (!font) throw new Error(`Font ${file} is not loaded.`);
  return font.getAdvanceWidth(text, size, { kerning: true });
}

/** Largest size that fits, else grapheme truncation with an ellipsis. */
export function fit(text: string, file: string, sizes: number[], maxWidth: number): { text: string; size: number } {
  const clean = text.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim();
  for (const size of sizes) {
    if (measure(clean, file, size) <= maxWidth) return { text: clean, size };
  }
  const size = sizes[sizes.length - 1] ?? 44;
  const graphemes = [...new Intl.Segmenter('he', { granularity: 'grapheme' }).segment(clean)].map((part) => part.segment);
  for (let count = graphemes.length - 1; count > 0; count -= 1) {
    const next = `${graphemes.slice(0, count).join('').trimEnd()}…`;
    if (measure(next, file, size) <= maxWidth) return { text: next, size };
  }
  return { text: '…', size };
}
