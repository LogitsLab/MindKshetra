import type { EventName } from "@/lib/events-names";

/**
 * Fire-and-forget client event. Browser counterpart of lib/events.ts: it
 * never throws and is never awaited, because measurement must not break or
 * slow a user-facing path. `keepalive` lets the beacon survive navigation.
 */
export function track(name: EventName, props?: Record<string, unknown>): void {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(props ? { name, props } : { name }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never surface */
  }
}
