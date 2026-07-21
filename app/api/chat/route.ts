import { NextRequest } from "next/server";
import { verifyAndFixCitations } from "@/lib/cite";
import {
  createChatSession,
  saveChatMessage,
} from "@/lib/chat-store";
import { crisisResponse, detectCrisis } from "@/lib/crisis";
import {
  buildMadhavSystemPrompt,
  createGroqChatStream,
  createGroqCompletion,
  stripThinkBlocks,
} from "@/lib/groq";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { warnIfRedisMissing } from "@/lib/redis";
import { buildRetrievalQuery, retrieveSlokas } from "@/lib/retrieve";
import { formatVerseRef } from "@/lib/slokas";
import { getAuthUserId } from "@/lib/supabase/server";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

type ChatBody = {
  messages?: ChatMessage[];
  language?: "en" | "hi";
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  warnIfRedisMissing();
  const limited = await rateLimit(`chat:${clientKey(request)}`, 20, 60_000);
  if (!limited.ok) {
    return new Response(
      JSON.stringify({
        error: `Too many requests. Try again in ${limited.retryAfterSec}s.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(limited.retryAfterSec),
        },
      }
    );
  }

  let body: ChatBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim()) {
    return new Response(JSON.stringify({ error: "A user message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const MAX_MESSAGE_CHARS = 2000;
  if (lastUser.content.length > MAX_MESSAGE_CHARS) {
    return new Response(
      JSON.stringify({
        error: `Message too long. Please keep it under ${MAX_MESSAGE_CHARS} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const language = body.language === "hi" ? "hi" : "en";
  const userId = await getAuthUserId();

  let sessionId = body.sessionId;
  if (!sessionId) {
    sessionId = (await createChatSession(userId)) ?? undefined;
  }

  const crisis = detectCrisis(lastUser.content);
  if (crisis.detected) {
    console.warn("[chat] crisis pattern detected");
    const response = crisisResponse(language);
    if (sessionId) {
      await saveChatMessage(sessionId, "user", lastUser.content);
      await saveChatMessage(sessionId, "assistant", response, []);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };
        if (sessionId) send({ type: "session", sessionId });
        send({ type: "citations", citations: [] });
        send({ type: "token", content: response });
        send({ type: "done" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "GROQ_API_KEY is not configured. Add it to .env.local and restart the server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const retrievalQuery = buildRetrievalQuery(messages);
  const cited = await retrieveSlokas(retrievalQuery || lastUser.content, 5);
  const systemPrompt = buildMadhavSystemPrompt(cited, language);

  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    }));

  const promptMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history,
  ];

  try {
    const groqRes = await createGroqChatStream(promptMessages);

    if (!groqRes.body) {
      return new Response(JSON.stringify({ error: "Empty Groq stream" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const citations = cited.map((s) => ({
      id: s.id,
      ref: formatVerseRef(s),
      english: s.english_translation,
      hindi: s.hindi_translation,
    }));

    const upstream = groqRes.body.getReader();
    const citedIds = cited.map((s) => s.id);

    const readable = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        if (sessionId) send({ type: "session", sessionId });
        send({ type: "citations", citations });

        let sseBuffer = "";
        let rawAssistant = "";
        let visibleSent = "";

        try {
          while (true) {
            const { done, value } = await upstream.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;

              let parsed: {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              try {
                parsed = JSON.parse(data);
              } catch {
                continue;
              }

              const token = parsed.choices?.[0]?.delta?.content;
              if (!token) continue;

              rawAssistant += token;
              const visible = stripThinkBlocks(rawAssistant);
              if (visible.length > visibleSent.length) {
                const delta = visible.slice(visibleSent.length);
                visibleSent = visible;
                send({ type: "token", content: delta });
              }
            }
          }

          let finalVisible = stripThinkBlocks(rawAssistant);
          if (finalVisible.length > visibleSent.length) {
            send({
              type: "token",
              content: finalVisible.slice(visibleSent.length),
            });
            visibleSent = finalVisible;
          }

          if (!visibleSent.trim()) {
            const fallback = await createGroqCompletion(promptMessages);
            if (fallback) {
              send({ type: "token", content: fallback });
              visibleSent = fallback;
            }
          }

          if (visibleSent.trim()) {
            const fixed = verifyAndFixCitations(visibleSent, cited);
            if (fixed !== visibleSent) {
              send({ type: "replace", content: fixed });
              visibleSent = fixed;
            }

            if (sessionId) {
              await saveChatMessage(sessionId, "user", lastUser.content);
              await saveChatMessage(
                sessionId,
                "assistant",
                visibleSent,
                citedIds
              );
            }

            send({ type: "done" });
          } else {
            send({
              type: "error",
              error: "Madhav could not form a reply. Please try again.",
            });
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream failed";
          if (visibleSent.trim()) {
            const fixed = verifyAndFixCitations(visibleSent, cited);
            if (fixed !== visibleSent) {
              send({ type: "replace", content: fixed });
              visibleSent = fixed;
            }
            if (sessionId) {
              await saveChatMessage(sessionId, "user", lastUser.content);
              await saveChatMessage(
                sessionId,
                "assistant",
                visibleSent,
                citedIds
              );
            }
            send({ type: "done" });
          } else {
            send({ type: "error", error: message });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[chat]", err);
    return new Response(
      JSON.stringify({
        error: "Madhav could not answer just now. Please try again in a moment.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
