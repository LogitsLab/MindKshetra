/** Format helpers for traditional Gita verse presentation. */

/** Strip trailing ॥ch.verse॥ / ।।ch.verse।। markers from Devanagari. */
export function stripVerseMarker(text: string): string {
  return text
    .replace(/[।|]{1,2}\s*\d+\s*[.:]\s*\d+\s*[।|]{0,2}\s*$/, "")
    .replace(/[॥।।]+\s*$/, "")
    .trim();
}

/**
 * Split a śloka into pādas on danda (।), typical two-line presentation.
 * Falls back to a mid-point space split when no danda is present.
 */
export function splitVerseLines(text: string): string[] {
  const cleaned = stripVerseMarker(text);
  if (!cleaned) return [];

  const byDanda = cleaned
    .split(/[।|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (byDanda.length >= 2) {
    return byDanda;
  }

  // IAST / single line — prefer a break near the middle at a space
  const mid = Math.floor(cleaned.length / 2);
  const left = cleaned.lastIndexOf(" ", mid);
  const right = cleaned.indexOf(" ", mid);
  const breakAt =
    left > cleaned.length * 0.25
      ? left
      : right > 0 && right < cleaned.length * 0.75
        ? right
        : -1;

  if (breakAt > 0) {
    return [cleaned.slice(0, breakAt).trim(), cleaned.slice(breakAt).trim()];
  }

  return [cleaned];
}

/** Remove leading ।।2.47।। / 2.47 style refs from commentary. */
export function cleanCommentary(text: string): string {
  return text
    .replace(/^[।|]{0,2}\s*\d+\s*[.:]\s*\d+\s*[।|]{0,2}\s*/, "")
    .replace(/^BG\s*\d+\s*[.:]\s*\d+\s*[:—-]?\s*/i, "")
    .replace(/^Commentary\s*/i, "")
    .replace(/^व्याख्या\s*[—–-]?\s*/, "")
    .trim();
}

/**
 * Word-gloss / padārtha fragments that were mistakenly stored as prose meaning.
 * These should never be shown in the Meaning panel (word-by-word already covers them).
 */
export function isGlossDumpCommentary(text?: string | null): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t || t === ".") return false;
  const hasDev = /[\u0900-\u097F]/.test(t);
  const semis = (t.match(/;/g) || []).length;
  const opens = (t.match(/\(/g) || []).length;
  const closes = (t.match(/\)/g) || []).length;
  if (opens > closes) return true;
  if (/^By Swami Sivananda\.?$/i.test(t)) return true;
  if (/^By Swami Sivananda/i.test(t) && hasDev) return true;
  if (/^\d+\.\d+\s/.test(t) && hasDev) return true;
  const parenGloss = (t.match(/[\u0900-\u097F]+\s*\([^)]{2,40}\)/g) || [])
    .length;
  if (parenGloss >= 3) return true;
  if (hasDev && semis >= 2 && t.length < 250) return true;
  if (
    /^[\u0900-\u097F]/.test(t) &&
    /\b(O |the |an |a |of |in |to |by |eager |arrayed)\b/i.test(t) &&
    semis >= 1 &&
    t.length < 300
  ) {
    return true;
  }
  const tokens = t.split(/;\s*/);
  if (
    tokens.length >= 3 &&
    t.length < 300 &&
    tokens.every((p) => p.length < 70) &&
    (hasDev || /^(the |O |an |a )/i.test(tokens[0]))
  ) {
    return true;
  }
  return false;
}

export function isTruncatedCommentary(text?: string | null): boolean {
  if (!text) return false;
  const t = text.trim();
  if (/\([^)]*$/.test(t)) return true;
  if (/[;:,]\s*$/.test(t)) return true;
  if (
    t.length >= 80 &&
    !/[.!?।॥]$/.test(t) &&
    /\b(to|the|and|of|a|for|in)$/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** True when commentary is real prose (not empty, gloss dump, or truncated). */
export function hasCommentary(text?: string | null): boolean {
  if (!text) return false;
  const cleaned = cleanCommentary(text);
  if (cleaned.length <= 1 || cleaned === ".") return false;
  if (isGlossDumpCommentary(cleaned)) return false;
  if (isTruncatedCommentary(cleaned)) return false;
  return true;
}

/** Traditional inline padārtha: word—meaning; word—meaning */
export function formatWordMeaningsInline(
  entries: Array<[string, string]>
): string {
  return entries
    .map(([word, meaning]) => `${word}—${meaning}`)
    .join("; ");
}
