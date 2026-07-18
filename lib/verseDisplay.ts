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

/** True when commentary is real content (not empty / placeholder "."). */
export function hasCommentary(text?: string | null): boolean {
  if (!text) return false;
  const cleaned = cleanCommentary(text);
  return cleaned.length > 1 && cleaned !== ".";
}

/** Traditional inline padārtha: word—meaning; word—meaning */
export function formatWordMeaningsInline(
  entries: Array<[string, string]>
): string {
  return entries
    .map(([word, meaning]) => `${word}—${meaning}`)
    .join("; ");
}
