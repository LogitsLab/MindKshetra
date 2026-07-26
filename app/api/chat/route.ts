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
  /** chat_sessions row id. NOT the chart session — see lib/astrology/incognito.ts. */
  sessionId?: string;
  chatSessionId?: string;
  incognito?: boolean;
  /** Chart linkage (T6b). Any one of these opts into the two-voice reply. */
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
    // Never fail the reply because the chart half broke.
    console.warn(
      "[chat] chart load failed, continuing Gita-only:",
      err instanceof Error ? err.message : String(err)
    );
  }
  return null;
}

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
  const userId = await getAuthUserId();
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

  // ── Chart-aware path (T6b/T6c) ─────────────────────────────────────────────
  //
  //   no chart linked ──▶ exactly today's behaviour, byte for byte
  //   chart linked    ──▶ reading call (temp 0.4, 220 tok) resolves FIRST,
  //                       its themes feed retrieval, then it is passed as
  //                       context into the teaching stream
  //
  // The reading is awaited rather than streamed in parallel for one reason: the
  // teaching prompt needs it. Streaming both truly concurrently would mean the
  // teaching could not respond to what the reading said. It is capped at 220
  // tokens precisely so this wait stays short.
  //
  // lib/astrology/* is imported DYNAMICALLY and only when a chart is actually
  // requested. It reaches the native `sweph` addon (engine -> swe, and also
  // dasha -> transits -> swe), and this is the busiest route in the app: a
  // chart-less message must not pay for a binary it never calls.
  const chart = await loadChartForChat(body);
  let reading: string | null = null;
  let chartThemeTags: string[] = [];
  let contextLineText: string | null = null;

  if (chart) {
    const [{ chartThemes, contextLine }, { verifyChartClaims }, prompts] =
      await Promise.all([
        import("@/lib/bridge/chart-to-verse"),
        import("@/lib/bridge/chart-verify"),
        import("@/lib/bridge/merged-prompt"),
      ]);

    const themes = chartThemes(chart.verdicts?.blended);
    chartThemeTags = themes.tags;
    contextLineText = contextLine(themes);

    try {
      const raw = await createGroqCompletion(
        [
          {
            role: "system",
            content: prompts.buildReadingPrompt(chart, language),
          },
          { role: "user", content: lastUser.content.slice(0, MAX_MESSAGE_CHARS) },
        ],
        {
          temperature: prompts.READING_TEMPERATURE,
          max_tokens: prompts.READING_MAX_TOKENS,
        }
      );
      let cleaned = stripThinkBlocks(raw).trim();

      // des/D7 — the chart guide may decline an off-chart question ("I can only
      // speak to your chart..."). That is a refusal, not a reading, and it must
      // never render as a labelled voice above the teaching. Suppressing it here
      // routes it through the same path as an empty chart, so the reply simply
      // degrades to single-voice.
      const DECLINE = /(only (speak|answer|comment).{0,24}chart|off[- ]chart|cannot (answer|help) with that|not (something|a question) (i|the chart) can)/i;
      if (DECLINE.test(cleaned)) {
        console.warn("[chat] chart voice declined — suppressing the epigraph");
        cleaned = "";
      }
      // Only the reading is verifiable; the teaching is not falsifiable.
      const verified = verifyChartClaims(cleaned, chart);
      reading = verified.text.trim() || null;
      if (verified.violations.length > 0) {
        console.warn(
          `[chat] chart reading: ${verified.violations.length} unverifiable claim(s) dropped`
        );
      }
    } catch (err) {
      // A failed reading degrades to Gita-only. It must never take the teaching
      // down with it — that isolation is why these are separate calls.
      console.warn(
        "[chat] chart reading failed, continuing without it:",
        err instanceof Error ? err.message : String(err)
      );
      reading = null;
    }
  }

  const retrievalQuery = buildRetrievalQuery(messages);
  const cited = await retrieveSlokas(
    retrievalQuery || lastUser.content,
    5,
    chartThemeTags
  );
  const systemPrompt = chart
    ? (await import("@/lib/bridge/merged-prompt")).buildTeachingPrompt(
        cited,
        language,
        reading
      )
    : buildMadhavSystemPrompt(cited, language);

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
        // Emitted BEFORE citations and before the first teaching token so the
        // client can reserve the epigraph slot (des/5A) and never reflow text
        // the reader is mid-sentence on.
        if (reading) send({ type: "reading", content: reading });
        if (contextLineText) send({ type: "chartContext", content: contextLineText });
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
                // Intentional swallow: SSE frames can split across reads, so a
                // partial chunk is expected traffic, not an error. Skipping it
                // lets the next read complete the frame. Not logged because it
                // would be noisy on every normal stream.
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
              await saveChatMessage(sessionId, "assistant", visibleSent, citedIds, {
                reading,
                chartContext: contextLineText,
              });
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
              await saveChatMessage(sessionId, "assistant", visibleSent, citedIds, {
                reading,
                chartContext: contextLineText,
              });
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
