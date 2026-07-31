import "server-only";
import { detectCrisis } from "@/lib/crisis";
import termsData from "@/data/moderation-terms.json";

/**
 * Pre-write screening for user-generated content (plan Phase 3). Sized for a
 * nonprofit with no paid moderators:
 *
 *   reject  — never enters the system (empty, over-length, links). The
 *             no-URLs rule alone kills the dominant spam class.
 *   hold    — stored but not published, queued for human review. Crisis
 *             language holds AND the caller must return the existing
 *             helpline response to the author — care first, moderation
 *             second. Term hits hold; nothing is ever auto-removed.
 *   publish — clean.
 *
 * Private journaling is NEVER screened — only content leaving the author's
 * own view (shared reflections, profiles, circle posts).
 */
export type ScreenResult =
  | { verdict: "publish" }
  | { verdict: "hold"; reason: "crisis" | "terms" }
  | { verdict: "reject"; reason: "empty" | "length" | "links" };

const URL_PATTERN =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|in|app|xyz|me|ly)\b)/i;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ASCII_ONLY = /^[\x00-\x7F]+$/;

/**
 * Precompiled once at module load. ASCII terms match on \b word boundaries —
 * plain substring held "grandiose" and "modus operandi" (both contain
 * "randi"). Terms with non-ASCII stay substring matches: JS \b only knows
 * [A-Za-z0-9_], so a Devanagari term would never sit "between boundaries"
 * and word-boundary matching would silently disable it.
 */
const COMPILED_TERMS: Array<
  { kind: "word"; pattern: RegExp } | { kind: "substring"; term: string }
> = (termsData.terms ?? [])
  .map((t) => t.toLowerCase())
  .filter((t) => t.length > 0)
  .map((term) =>
    ASCII_ONLY.test(term)
      ? { kind: "word" as const, pattern: new RegExp(`\\b${escapeRegex(term)}\\b`) }
      : { kind: "substring" as const, term }
  );

export function screenText(text: string, maxLen = 1000): ScreenResult {
  const trimmed = text.trim();
  if (!trimmed) return { verdict: "reject", reason: "empty" };
  if (trimmed.length > maxLen) return { verdict: "reject", reason: "length" };
  if (URL_PATTERN.test(trimmed)) return { verdict: "reject", reason: "links" };

  if (detectCrisis(trimmed).detected) {
    return { verdict: "hold", reason: "crisis" };
  }

  const lower = trimmed.toLowerCase();
  for (const t of COMPILED_TERMS) {
    const hit =
      t.kind === "word" ? t.pattern.test(lower) : lower.includes(t.term);
    if (hit) {
      return { verdict: "hold", reason: "terms" };
    }
  }

  return { verdict: "publish" };
}
