/**
 * Client-side Meta Pixel helpers. Safe to call when Pixel is absent (no-op).
 */
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMeta(
  event: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (params) window.fbq("trackCustom", event, params);
  else window.fbq("trackCustom", event);
}

export function trackMetaStandard(
  event: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (params) window.fbq("track", event, params);
  else window.fbq("track", event);
}
