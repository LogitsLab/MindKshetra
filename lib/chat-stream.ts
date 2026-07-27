/**
 * The one SSE parser for /api/chat.
 *
 *   Response ──▶ readChatStream() ──▶ async iterable of typed events
 *
 * ChatWindow and AstroChat each had their own copy of this loop, and they had
 * already drifted: AstroChat only understood `token`, so it would have silently
 * ignored the `reading` and `chartContext` events the merged route now emits.
 * That is the duplication worth removing — not the components themselves, which
 * do genuinely different jobs (full-page chat with sessions and a sidebar, vs a
 * controlled embedded panel inside ChartHub).
 *
 * Frame splitting is on "\n\n" because an SSE frame can arrive split across
 * reads. The trailing partial is carried to the next read rather than parsed,
 * which is why a malformed-JSON catch here is expected traffic, not an error.
 */
export type ChatStreamEvent =
  | { type: "session"; sessionId: string }
  | { type: "reading"; content: string }
  | { type: "chartContext"; content: string }
  | { type: "citations"; citations: ChatCitation[] }
  | { type: "token"; content: string }
  | { type: "replace"; content: string }
  | { type: "error"; error: string }
  | { type: "done" };

export type ChatCitation = {
  id: number;
  ref: string;
  english: string;
  hindi?: string;
};

export async function* readChatStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    // Keep the tail: it is very likely an incomplete frame.
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      let payload: ChatStreamEvent;
      try {
        payload = JSON.parse(line.slice(5).trim());
      } catch {
        // Expected: a frame that split mid-JSON across two reads.
        continue;
      }
      if (payload && typeof payload.type === "string") yield payload;
    }
  }
}

/** Body shape accepted by /api/chat. Chart fields opt into astrology-only replies. */
export type ChatRequestBody = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  language: "en" | "hi";
  chatSessionId?: string;
  incognito?: boolean;
  memberId?: string;
  chartSessionId?: string;
  birth?: Record<string, unknown>;
};

export async function postChat(body: ChatRequestBody): Promise<Response> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Chat failed");
  }
  if (!res.body) throw new Error("No stream");
  return res;
}
