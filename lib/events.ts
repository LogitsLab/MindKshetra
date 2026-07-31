import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * First-party, privacy-respecting event sink (migration 010). Writes are
 * fire-and-forget: measurement must never break or slow a user-facing path.
 * No IP, no user agent — a name, optional owner, optional small props.
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
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export function isEventName(value: unknown): value is EventName {
  return (
    typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value)
  );
}

const MAX_PROPS_BYTES = 2048;

export async function recordEvent(
  name: EventName,
  userId: string | null,
  props?: Record<string, unknown>
): Promise<void> {
  try {
    let safeProps: Record<string, unknown> | null = null;
    if (props) {
      const serialized = JSON.stringify(props);
      if (serialized.length <= MAX_PROPS_BYTES) safeProps = props;
    }
    const admin = createAdminClient();
    const { error } = await admin.from("app_events").insert({
      user_id: userId,
      name,
      props: safeProps,
    });
    if (error) {
      console.warn("[events] insert failed:", error.message);
    }
  } catch (err) {
    console.warn(
      "[events] dropped:",
      err instanceof Error ? err.message : err
    );
  }
}
