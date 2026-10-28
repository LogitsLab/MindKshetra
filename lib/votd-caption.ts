import type { VotdPayload } from "@/lib/votd-email";

/**
 * Caption a maintainer pastes alongside the daily reel when posting it to the
 * WhatsApp community (no WhatsApp API can auto-post to a community, so this is
 * the human step). Pure + deterministic so it is unit-testable.
 */
export function buildVotdCaption(
  payload: Pick<VotdPayload, "ref" | "site">,
  opts: { whatsappUrl?: string | null } = {}
): string {
  const parts = [
    `🪔 Verse of the day — Bhagavad Gītā ${payload.ref}`,
    "",
    `Today's reflection in MindKshetra: ${payload.site}`,
  ];
  if (opts.whatsappUrl) {
    parts.push("", `Invite someone to sit with us: ${opts.whatsappUrl}`);
  }
  return parts.join("\n");
}
