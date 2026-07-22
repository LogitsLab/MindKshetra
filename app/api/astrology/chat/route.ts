import { NextRequest } from "next/server";
import { buildChartChatContext } from "@/lib/astrology/blend";
import { refreshCurrentDasha } from "@/lib/astrology/dasha";
import { computeChart } from "@/lib/astrology/engine";
import {
  mapMemberRow,
  memberToBirthInput,
  parseBirthBody,
} from "@/lib/astrology/members";
import { buildAstrologyChatSystemPrompt } from "@/lib/astrology/predictions";
import type { ChartPayload } from "@/lib/astrology/types";
import { ENGINE_VERSION } from "@/lib/astrology/types";
import { memoryGet } from "@/lib/astrology/memory-cache";
import {
  createGroqChatStream,
  createGroqCompletion,
  stripThinkBlocks,
  type ChatTurn,
} from "@/lib/groq";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { redisGet } from "@/lib/redis";
import { createClient, getSignedInUserId } from "@/lib/supabase/server";
import { DateTime } from "luxon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  messages?: { role: "user" | "assistant"; content: string }[];
  language?: "en" | "hi";
  memberId?: string;
  sessionId?: string;
  birth?: Record<string, unknown>;
};

function live(chart: ChartPayload): ChartPayload {
  return refreshCurrentDasha(chart, DateTime.utc().toISODate()!);
}

async function loadChart(body: Body): Promise<ChartPayload | null> {
  if (body.memberId) {
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

    const { data: cached } = await supabase
      .from("astrology_chart_cache")
      .select("payload")
      .eq("member_id", body.memberId)
      .eq("engine_version", ENGINE_VERSION)
      .maybeSingle();

    if (cached?.payload) return live(cached.payload as ChartPayload);
    return live(computeChart(memberToBirthInput(mapMemberRow(row))));
  }

  if (body.sessionId) {
    const key = `astro:incog:${body.sessionId}`;
    const raw = (await redisGet(key)) ?? memoryGet(key);
    if (raw) return live(JSON.parse(raw) as ChartPayload);
  }

  if (body.birth) {
    const birth = parseBirthBody(body.birth);
    if (birth) return live(computeChart(birth));
  }

  return null;
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(`astro:chat:${clientKey(request)}`, 20, 60_000);
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

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser?.content?.trim()) {
    return new Response(JSON.stringify({ error: "user message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (lastUser.content.length > 2000) {
    return new Response(JSON.stringify({ error: "Message too long" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const chart = await loadChart(body);
  if (!chart) {
    return new Response(
      JSON.stringify({ error: "Chart not found — compute a chart first" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const language = body.language === "hi" ? "hi" : "en";
  const context = buildChartChatContext(chart);
  const system = buildAstrologyChatSystemPrompt(chart, language, context);

  const history: ChatTurn[] = [
    { role: "system", content: system },
    ...messages.slice(-12).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  try {
    const groqRes = await createGroqChatStream(history);
    if (!groqRes.ok || !groqRes.body) {
      const fallback = await createGroqCompletion(history);
      const text = stripThinkBlocks(fallback) || "I could not form a reply just now.";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", content: text })}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        const reader = groqRes.body!.getReader();
        let visible = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data) as {
                  choices?: { delta?: { content?: string } }[];
                };
                const token = json.choices?.[0]?.delta?.content;
                if (token) {
                  visible += token;
                  const cleaned = stripThinkBlocks(visible);
                  // Stream only newly visible suffix after think-strip (simple: send token if no open think)
                  if (!visible.includes("<think>") || visible.includes("</think>")) {
                    send({ type: "token", content: token });
                  }
                  void cleaned;
                }
              } catch {
                /* ignore partial */
              }
            }
          }
        } finally {
          send({ type: "done" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[astrology/chat]", err);
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
