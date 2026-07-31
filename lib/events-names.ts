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
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(value: unknown): value is EventName {
  return (
    typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value)
  );
}
