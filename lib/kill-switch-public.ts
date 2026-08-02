/**
 * Client-readable mirror of the community kill switches.
 *
 * The server-side switch (lib/kill-switch.ts) is `server-only`, so no client
 * component could see it — which meant the UI offered "Share with seekers" on
 * every saved journal note and "be the first to reflect" on all 701 verse
 * pages while the API answered 503 "Sharing is paused right now." The person
 * got an invitation and then a refusal.
 *
 * Same fail-safe reading as the server: unset or unrecognised means PAUSED,
 * so a missing NEXT_PUBLIC_ var hides the affordance rather than dangling it.
 * Keep the two in step — the client hides the door, the server still guards it.
 */
const ON_VALUES = new Set(["1", "true", "on", "yes"]);

function open(raw: string | undefined): boolean {
  if (raw == null) return false;
  return ON_VALUES.has(raw.trim().toLowerCase());
}

/** Sharing a reflection to a verse page. */
export function reflectionsOpen(): boolean {
  return open(process.env.NEXT_PUBLIC_COMMUNITY_REFLECTIONS_ENABLED);
}

/** Reporting someone else's reflection. */
export function reportsOpen(): boolean {
  return open(process.env.NEXT_PUBLIC_COMMUNITY_REPORTS_ENABLED);
}
