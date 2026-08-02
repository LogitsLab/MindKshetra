import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventName } from "@/lib/events-names";

/**
 * First-party, privacy-respecting event sink (migration 010). Writes are
 * fire-and-forget: measurement must never break or slow a user-facing path.
 * No IP, no user agent — a name, optional owner, optional small props.
 *
 * The name allowlist lives in lib/events-names.ts (isomorphic) so browser
 * callers (lib/track.ts) can share it without pulling in `server-only`.
 */
export { EVENT_NAMES, isEventName } from "@/lib/events-names";
export type { EventName } from "@/lib/events-names";

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
