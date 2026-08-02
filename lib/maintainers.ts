import "server-only";

/**
 * Maintainer allowlist via MAINTAINER_USER_IDS (comma-separated Supabase
 * auth user ids). An env allowlist beats a roles table at this scale; the
 * upgrade path to a user_roles table is noted in TODOS.md. Empty env means
 * nobody — the admin surface fails closed.
 */
export function isMaintainer(userId: string | null): boolean {
  if (!userId) return false;
  const raw = process.env.MAINTAINER_USER_IDS ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}
