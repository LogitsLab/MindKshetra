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
export const dynamic = "force-dynamic";
// Streams a Groq completion (plus a chart compute on the astrology branch);
// platform-default timeouts can kill the stream mid-reply.
export const maxDuration = 60;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

type ChatBody = {
  messages?: ChatMessage[];
  language?: "en" | "hi";
  /** chat_sessions row id. NOT the chart session — see lib/astrology/incognito.ts. */
  sessionId?: string;
  chatSessionId?: string;
  incognito?: boolean;
  /** Chart linkage. When present, reply is astrology-only (no Gita verses). */
  memberId?: string;
  chartSessionId?: string;
  birth?: Record<string, unknown>;
};

/**
 * Loads a chart only when one was actually requested.
 *
 * The dynamic imports are load-bearing, not style: lib/astrology/engine reaches
 * the native `sweph` addon, and so does lib/astrology/dasha via transits — so
 * gating the engine alone would achieve nothing. Chart-less requests, which are
 * the overwhelming majority on this route, touch none of it.
 */
async function loadChartForChat(body: ChatBody) {
  const wantsChart = Boolean(body.memberId || body.chartSessionId || body.birth);
  if (!wantsChart) return null;

  try {
    const [{ readChartSessionId, incognitoKey }, { computeChart }, { refreshCurrentDasha }] =
      await Promise.all([
        import("@/lib/astrology/incognito"),
        import("@/lib/astrology/engine"),
        import("@/lib/astrology/dasha"),
      ]);
    const { DateTime } = await import("luxon");
    const live = (c: Parameters<typeof refreshCurrentDasha>[0]) =>
      refreshCurrentDasha(c, DateTime.utc().toISODate()!);

    if (body.memberId) {
      const { createClient, getSignedInUserId } = await import("@/lib/supabase/server");
      const userId = await getSignedInUserId();
      if (!userId) return null;
      const supabase = await createClient();
      const { data: row } = await supabase
        .from("astrology_members")
        .select("*")
        .eq("id", body.memberId)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (!row) return null;
      const { ENGINE_VERSION } = await import("@/lib/astrology/types");
      const { data: cached } = await supabase
        .from("astrology_chart_cache")
        .select("payload")
        .eq("member_id", body.memberId)
        .eq("engine_version", ENGINE_VERSION)
        .maybeSingle();
      if (cached?.payload) return live(cached.payload as never);
      const { mapMemberRow, memberToBirthInput } = await import("@/lib/astrology/members");
      return live(computeChart(memberToBirthInput(mapMemberRow(row))) as never);
    }

    const session = readChartSessionId(
      body as unknown as Record<string, unknown>,
      "chat"
    );
    if (session.ok && session.id) {
      const { redisGet } = await import("@/lib/redis");
      const { memoryGet } = await import("@/lib/astrology/memory-cache");
      const key = incognitoKey(session.id);
      const raw = (await redisGet(key)) ?? memoryGet(key);
      if (raw) return live(JSON.parse(raw) as never);
      // eng/E16: the cache is an optimisation, not a source of truth. Fall
      // through to `birth` rather than failing the whole reply.
    }

    if (body.birth) {
      const { parseBirthBody } = await import("@/lib/astrology/members");
      const birth = parseBirthBody(body.birth);
      if (birth) return live(computeChart(birth) as never);
    }
  } catch (err) {
    console.warn(
      "[chat] chart load failed:",
      err instanceof Error ? err.message : String(err)
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  warnIfRedisMissing();
  // Keyed per-user when signed in so carrier-NAT users don't share a bucket.
  const authUserId = await getAuthUserId();
  const limited = await rateLimit(
    `chat:${authUserId ?? clientKey(request)}`,
    20,
    60_000
  );
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
  } catch (err) {
    // SyntaxError from JSON.parse, or a TypeError if the stream aborted
    // mid-body. Both are client-side problems, hence 400 — but log which,
    // because "Invalid JSON body" alone can't distinguish a malformed payload
    // from a connection that died halfway.
    console.warn(
      "[chat] request body parse failed:",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    );
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
  const userId = authUserId;
  const incognito = Boolean(body.incognito);

  let sessionId: string | undefined = undefined;
  if (!incognito) {
    // `chatSessionId` is the unambiguous name; `sessionId` stays accepted so
    // tabs holding the old bundle keep working across one deploy.
    sessionId = body.chatSessionId ?? body.sessionId;
    if (!sessionId) {
      sessionId = (await createChatSession(userId)) ?? undefined;
    }
  }

  const crisis = detectCrisis(lastUser.content);
  if (crisis.detected) {
    console.warn("[chat] crisis pattern detected");
    const response = crisisResponse(language);
    if (sessionId) {
      await saveChatMessage(sessionId, "user", lastUser.content);
      // des/D6 + 4A — NO voices on a crisis reply, deliberately. The chart is
      // suppressed entirely: a deterministic "Saturn holds this house until
      // 2028" beside a helpline reads as confirmation that things are fated to
      // stay bad. Persisting one would resurrect it on reload.
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
      headers: SSE_HEADERS,
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

  // ── Chart path vs Madhav path ──────────────────────────────────────────────
  //
  //   chart linked    ──▶ detailed Jyotish answer only (no Gita verses / Madhav)
  //   no chart linked ──▶ Madhav + retrieved shlokas (unchanged)
  //
  // Astrology chat used to be merged into a two-voice reply (short chart epigraph
  // + Gita teaching). Users asking about a chart were getting scripture instead
  // of a full reading. Chart requests stay on the astrology prompt.
  //
  // lib/astrology/* is imported DYNAMICALLY and only when a chart is actually
  // requested — it reaches the native `sweph` addon.
  const wantsChart = Boolean(body.memberId || body.chartSessionId || body.birth);
  const chart = await loadChartForChat(body);

  if (wantsChart && !chart) {
    return new Response(JSON.stringify({ error: "Chart not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (chart) {
    return streamAstrologyReply({
      chart,
      messages,
      language,
      sessionId,
      lastUserContent: lastUser.content,
      maxMessageChars: MAX_MESSAGE_CHARS,
    });
  }

  // Open the SSE response immediately so the client can stream. Retrieval and
  // Groq run inside the stream — awaiting them first buffered the whole reply
  // behind a silent wait (looked like chat was not streaming).
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      if (sessionId) send({ type: "session", sessionId });

      try {
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

        const citations = cited.map((s) => ({
          id: s.id,
          ref: formatVerseRef(s),
          english: s.english_translation,
          hindi: s.hindi_translation,
        }));
        const citedIds = cited.map((s) => s.id);
        send({ type: "citations", citations });

        const groqRes = await createGroqChatStream(promptMessages);
        if (!groqRes.body) {
          send({ type: "error", error: "Empty Groq stream" });
          return;
        }

        const upstream = groqRes.body.getReader();
        let sseBuffer = "";
        let rawAssistant = "";
        let visibleSent = "";

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
            await saveChatMessage(sessionId, "assistant", visibleSent, citedIds);
          }

          send({ type: "done" });
        } else {
          send({
            type: "error",
            error: "Madhav could not form a reply. Please try again.",
          });
        }
      } catch (err) {
        console.error("[chat]", err);
        send({
          type: "error",
          error:
            err instanceof Error
              ? err.message
              : "Madhav could not answer just now. Please try again in a moment.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: SSE_HEADERS });
}

const ASTROLOGY_CHAT_TEMPERATURE = 0.4;
const ASTROLOGY_CHAT_MAX_TOKENS = 1200;

async function streamAstrologyReply(args: {
  chart: NonNullable<Awaited<ReturnType<typeof loadChartForChat>>>;
  messages: ChatMessage[];
  language: "en" | "hi";
  sessionId: string | undefined;
  lastUserContent: string;
  maxMessageChars: number;
}): Promise<Response> {
  const { chart, messages, language, sessionId, lastUserContent, maxMessageChars } =
    args;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      if (sessionId) send({ type: "session", sessionId });
      send({ type: "citations", citations: [] });

      let visibleSent = "";

      try {
        const [
          { buildAstrologyChatSystemPrompt },
          { buildChartChatContext },
          { verifyChartClaims },
        ] = await Promise.all([
          import("@/lib/astrology/predictions"),
          import("@/lib/astrology/blend"),
          import("@/lib/bridge/chart-verify"),
        ]);

        const systemPrompt = buildAstrologyChatSystemPrompt(
          chart,
          language,
          buildChartChatContext(chart)
        );

        const history = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-12)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content.slice(0, maxMessageChars),
          }));

        const promptMessages = [
          { role: "system" as const, content: systemPrompt },
          ...history,
        ];

        const groqRes = await createGroqChatStream(promptMessages, {
          temperature: ASTROLOGY_CHAT_TEMPERATURE,
          max_tokens: ASTROLOGY_CHAT_MAX_TOKENS,
        });

        if (!groqRes.body) {
          send({ type: "error", error: "Empty Groq stream" });
          return;
        }

        const upstream = groqRes.body.getReader();
        let sseBuffer = "";
        let rawAssistant = "";

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
          const fallback = await createGroqCompletion(promptMessages, {
            temperature: ASTROLOGY_CHAT_TEMPERATURE,
            max_tokens: ASTROLOGY_CHAT_MAX_TOKENS,
          });
          if (fallback) {
            send({ type: "token", content: fallback });
            visibleSent = fallback;
          }
        }

        if (visibleSent.trim()) {
          const verified = verifyChartClaims(visibleSent, chart);
          if (verified.violations.length > 0) {
            console.warn(
              `[chat] astrology reply: ${verified.violations.length} unverifiable claim(s) dropped`
            );
          }
          if (verified.text !== visibleSent) {
            send({ type: "replace", content: verified.text });
            visibleSent = verified.text;
          }

          if (sessionId) {
            await saveChatMessage(sessionId, "user", lastUserContent);
            await saveChatMessage(sessionId, "assistant", visibleSent, []);
          }

          send({ type: "done" });
        } else {
          send({
            type: "error",
            error: "Could not form a chart reply. Please try again.",
          });
        }
      } catch (err) {
        console.error("[chat] astrology", err);
        if (visibleSent.trim()) {
          send({ type: "done" });
        } else {
          send({
            type: "error",
            error:
              err instanceof Error
                ? err.message
                : "Could not answer from this chart just now. Please try again.",
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: SSE_HEADERS });
}
