import "server-only";

/**
 * Expo Push Service sender. No SDK — the HTTP contract is small and stable.
 * Chunked at Expo's documented 100-message limit. DeviceNotRegistered tickets
 * surface the dead tokens so the caller can disable them (token hygiene is
 * part of v1, receipt polling is a fast-follow).
 */
export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

export function isExpoPushToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(value)
  );
}

export async function sendExpoPush(messages: PushMessage[]): Promise<{
  attempted: number;
  ok: number;
  staleTokens: string[];
}> {
  let ok = 0;
  const staleTokens: string[] = [];

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        console.warn("[push] expo send failed:", res.status);
        continue;
      }
      const payload = (await res.json()) as {
        data?: Array<{
          status: "ok" | "error";
          message?: string;
          details?: { error?: string };
        }>;
      };
      (payload.data ?? []).forEach((ticket, idx) => {
        if (ticket.status === "ok") {
          ok += 1;
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          staleTokens.push(chunk[idx].to);
        }
      });
    } catch (err) {
      console.warn(
        "[push] expo send threw:",
        err instanceof Error ? err.message : err
      );
    }
  }

  return { attempted: messages.length, ok, staleTokens };
}
