import { isEventName, type EventName } from "@/lib/events-names";

/**
 * Fire-and-forget client beacon → POST /api/events.
 *
 * Only names from the isomorphic allowlist (lib/events-names.ts) are sent;
 * the API rejects everything else anyway. `sendBeacon` is preferred because
 * share flows routinely background the tab (native share sheet, app switch)
 * and a plain fetch can be killed mid-flight; `keepalive` fetch is the
 * fallback. Failures are swallowed — measurement must never break or slow a
 * user-facing path.
 */
export function track(
  name: EventName,
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (!isEventName(name)) return;

  try {
    const body = JSON.stringify(props ? { name, props } : { name });

    if (typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(
        "/api/events",
        new Blob([body], { type: "application/json" })
      );
      if (sent) return;
    }

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* fire-and-forget */
    });
  } catch {
    /* measurement must never break the page */
  }
}
