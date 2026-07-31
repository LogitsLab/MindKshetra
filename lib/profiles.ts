import "server-only";

/**
 * Public-profile validation. Handles are ASCII (the DESIGN.md rule — no
 * tracking/uppercase on Devanagari — plus URL-safety); display names may be
 * any script. Anonymous users cannot create a profile: pseudonymity yes,
 * throwaway unaccountability no (enforced at the API with getSignedInUserId).
 */
export const HANDLE_SHAPE = /^[a-z0-9_]{3,24}$/;

export const AVATAR_KEYS = [
  "lotus",
  "conch",
  "wheel",
  "diya",
  "veena",
  "peacock",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "madhav",
  "krishna",
  "mindkshetra",
  "logitslab",
  "support",
  "help",
  "official",
  "team",
  "staff",
  "root",
  "system",
  "api",
  "www",
  "about",
  "privacy",
  "account",
  "everyone",
  "all",
]);

export function isValidHandle(value: unknown): value is string {
  return (
    typeof value === "string" &&
    HANDLE_SHAPE.test(value) &&
    !RESERVED_HANDLES.has(value)
  );
}

export function isAvatarKey(value: unknown): value is AvatarKey {
  return (
    typeof value === "string" &&
    (AVATAR_KEYS as readonly string[]).includes(value)
  );
}
