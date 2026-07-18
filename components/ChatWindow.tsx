"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type Citation = {
  id: number;
  ref: string;
  english: string;
  hindi?: string;
};

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type Props = {
  initialPrompt?: string;
};

export default function ChatWindow({ initialPrompt }: Props) {
  const { lang, t } = useLanguage();
  const welcome = useMemo<UiMessage>(
    () => ({
      id: "welcome",
      role: "assistant",
      content: t("welcomeMadhav"),
    }),
    [t]
  );

  const starters = useMemo(
    () => [
      t("starter1"),
      t("starter2"),
      t("starter3"),
      t("starter4"),
      t("starter5"),
    ],
    [t]
  );

  const [messages, setMessages] = useState<UiMessage[]>([welcome]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  // Drop any legacy saved chats; sessions are in-memory only
  useEffect(() => {
    try {
      localStorage.removeItem("mindkshetra-madhav-chat");
    } catch {
      /* ignore */
    }
  }, []);

  // Keep welcome text in sync when language toggles and chat is only welcome
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.id === "welcome") {
        return [welcome];
      }
      return prev.map((m) =>
        m.id === "welcome" ? { ...m, content: welcome.content } : m
      );
    });
  }, [welcome]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string, baseMessages?: UiMessage[]) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setInput("");

      const current = baseMessages ?? messages;
      const userMsg: UiMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `a-${Date.now()}`;
      const nextMessages = [...current, userMsg];

      setMessages([
        ...nextMessages,
        { id: assistantId, role: "assistant", content: "", citations: [] },
      ]);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: lang,
            messages: nextMessages
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        if (!res.body) throw new Error("No response stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        let citations: Citation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const line = part.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let payload: {
              type?: string;
              content?: string;
              citations?: Citation[];
              error?: string;
            };
            try {
              payload = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (payload.type === "citations" && payload.citations) {
              citations = payload.citations;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, citations } : m
                )
              );
            } else if (payload.type === "token" && payload.content) {
              full += payload.content;
              const snapshot = full;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: snapshot, citations }
                    : m
                )
              );
            } else if (payload.type === "replace" && payload.content) {
              full = payload.content;
              const snapshot = full;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: snapshot, citations }
                    : m
                )
              );
            } else if (payload.type === "error") {
              throw new Error(payload.error || "Stream error");
            }
          }
        }

        if (!full.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      lang === "hi"
                        ? "अभी उत्तर नहीं बन सका। थोड़ी देर बाद फिर प्रयास करें।"
                        : "I could not form a reply just now. Try once more in a moment.",
                    citations,
                  }
                : m
            )
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        let hadPartial = false;
        setMessages((prev) => {
          const currentMsg = prev.find((m) => m.id === assistantId);
          if (currentMsg?.content?.trim()) {
            hadPartial = true;
            return prev;
          }
          return prev.filter((m) => m.id !== assistantId);
        });
        setError(hadPartial ? `${message} (partial)` : message);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, lang]
  );

  useEffect(() => {
    if (!initialPrompt?.trim() || initialSent.current) return;
    initialSent.current = true;
    void sendMessage(initialPrompt, [welcome]);
  }, [initialPrompt, sendMessage, welcome]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  function clearChat() {
    setMessages([welcome]);
    setError(null);
  }

  const showStarters =
    messages.length <= 1 && !loading && !initialPrompt?.trim();

  return (
    <div className="flex h-[calc(100dvh-11.5rem)] max-h-[720px] min-h-[22rem] flex-col overflow-hidden border border-[var(--line)] bg-[rgba(14,20,32,0.65)] shadow-[0_0_80px_rgba(61,122,106,0.08)] backdrop-blur-sm sm:h-[min(68dvh,680px)] sm:min-h-[28rem]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/brand/madhav.svg"
            alt=""
            width={28}
            height={28}
            className="shrink-0 opacity-90"
          />
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] sm:text-xs">
            {t("sessionEphemeral")}
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          disabled={loading}
          className="shrink-0 px-3 py-2 text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50"
        >
          {t("clearChat")}
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:space-y-5 sm:p-6">
        {showStarters && (
          <div className="mb-2 flex flex-col items-center border-b border-white/[0.06] pb-5 pt-1 text-center sm:pb-6 sm:pt-2">
            <Image
              src="/brand/madhav.svg"
              alt=""
              width={56}
              height={56}
              className="opacity-85 sm:h-16 sm:w-16"
            />
            <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-[var(--text-muted)]">
              {t("madhavIntro")}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[min(92%,28rem)] break-words sm:max-w-[92%] ${
              msg.role === "user" ? "ml-auto" : "mr-auto"
            }`}
          >
            <div
              className={`mb-1.5 flex items-center gap-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <Image
                  src="/brand/madhav.svg"
                  alt=""
                  width={20}
                  height={20}
                  className="opacity-80"
                />
              )}
              <p
                className={`text-[11px] uppercase tracking-[0.16em] ${
                  msg.role === "user"
                    ? "text-[var(--brass-soft)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {msg.role === "user" ? t("you") : t("madhav")}
              </p>
            </div>
            <div
              className={`px-3.5 py-3 text-[15px] font-light leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] sm:px-4 ${
                msg.role === "user"
                  ? "bg-[rgba(201,162,39,0.14)] text-[var(--text)]"
                  : "border border-[var(--line)] bg-white/[0.04] text-[var(--text)]"
              }`}
            >
              {msg.content || (loading ? t("reflecting") : "")}
            </div>
            {msg.role === "assistant" &&
              msg.citations &&
              msg.citations.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.citations.slice(0, 3).map((c) => (
                    <Link
                      key={c.id}
                      href={`/sloka/${c.id}`}
                      className="block border border-[var(--line)] bg-black/30 px-3 py-3 text-sm transition hover:border-[var(--brass)]/40"
                    >
                      <span className="text-[var(--brass-soft)]">{c.ref}</span>
                      <span className="mt-0.5 block line-clamp-2 font-light text-[var(--text-muted)]">
                        {lang === "hi" && c.hindi ? c.hindi : c.english}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
          </div>
        ))}

        {showStarters && (
          <div className="flex flex-wrap gap-2 pt-1">
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void sendMessage(starter)}
                disabled={loading}
                className="min-h-11 border border-[var(--line)] px-3 py-2.5 text-left text-sm text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] disabled:opacity-50"
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="border-t border-[var(--line)] bg-[rgba(140,60,70,0.2)] px-4 py-2 text-sm text-[#f0c4c8]">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex gap-2 border-t border-[var(--line)] p-2.5 sm:p-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("sharePlaceholder")}
          disabled={loading}
          enterKeyHint="send"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 border border-[var(--line)] bg-black/30 px-3 py-3 text-base text-[var(--text)] placeholder:text-[var(--text-muted)]/60 outline-none focus:border-[var(--brass)]/50 disabled:opacity-60 sm:text-[15px]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-11 shrink-0 bg-[var(--brass)] px-4 py-3 text-sm font-medium text-[var(--void)] transition hover:bg-[var(--brass-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
        >
          {loading ? "…" : t("send")}
        </button>
      </form>
    </div>
  );
}
