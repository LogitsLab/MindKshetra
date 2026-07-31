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

const TERMS: string[] = (termsData.terms ?? []).map((t) => t.toLowerCase());

export function screenText(text: string, maxLen = 1000): ScreenResult {
  const trimmed = text.trim();
  if (!trimmed) return { verdict: "reject", reason: "empty" };
  if (trimmed.length > maxLen) return { verdict: "reject", reason: "length" };
  if (URL_PATTERN.test(trimmed)) return { verdict: "reject", reason: "links" };

  if (detectCrisis(trimmed).detected) {
    return { verdict: "hold", reason: "crisis" };
  }

  const lower = trimmed.toLowerCase();
  for (const term of TERMS) {
    if (term && lower.includes(term)) {
      return { verdict: "hold", reason: "terms" };
    }
  }

  return { verdict: "publish" };
}
