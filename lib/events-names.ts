/**
 * Event-name allowlist, shared by the server sink (lib/events.ts) and browser
 * callers (lib/track.ts). Isomorphic on purpose: lib/events.ts is
 * `server-only`, so client code imports names and types from here instead.
 */
export const EVENT_NAMES = [
  "permission_prompted",
  "permission_granted",
  "permission_denied",
  "notif_opened",
  "verse_completed",
  "streak_recorded",
  "milestone_shown",
  "share_card",
  "chart_cast",
  "predictions_viewed",
  "sadhana_logged",
  "meditation_completed",
  // Gate metrics G1/G2. sangha_attended predates the Sangha → Community UI
  // rename and stays as-is: gate queries and recorded history bind to the
  // name, not to the label on the page.
  "reflection_shared",
  "sangha_attended",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(value: unknown): value is EventName {
  return (
    typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value)
  );
}
