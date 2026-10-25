/**
 * Automated auth-test accounts. They bounce, stay on Resend's suppression
 * list, and are not subscribers. A real logitslab.com address still receives
 * the verse.
 */
export function isVotdBroadcastRecipient(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return false;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain === "logitslab.com" && local.startsWith("qa.")) return false;
  return true;
}
