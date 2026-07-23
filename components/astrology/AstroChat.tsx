"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  memberId?: string;
  sessionId?: string;
  birth?: Record<string, unknown>;
  starters?: string[];
  contextLine?: string;
};

export default function AstroChat({
  memberId,
  sessionId,
  birth,
  starters,
  contextLine,
}: Props) {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const defaultStarters =
    starters ||
    (lang === "hi"
      ? [
          "मेरी वर्तमान दशा क्या कहती है?",
          "करियर के लिए इस कुंडली में क्या मजबूत है?",
          "विवाह भाव कैसे दिखता है?",
        ]
      : [
          "What does my current dasha emphasize?",
          "What supports career in this chart?",
          "How does the 7th house read for relationships?",
        ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    const nextMessages: Msg[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/astrology/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          language: lang,
          memberId,
          sessionId,
          birth,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Chat failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim()) as {
              type: string;
              content?: string;
            };
            if (payload.type === "token" && payload.content) {
              assistant += payload.content;
              setMessages([
                ...nextMessages,
                { role: "assistant", content: assistant },
              ]);
            }
          } catch {
            /* ignore */
          }
        }
      }

      if (!assistant.trim()) {
        setMessages([
          ...nextMessages,
          { role: "assistant", content: t("astroChatEmpty") },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages(nextMessages);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[28rem] flex-col border border-[var(--line)]">
      <div className="border-b border-[var(--hairline)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg text-[var(--text)]">
              {t("astroChatTitle")}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {t("astroChatBlurb")}
            </p>
          </div>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="shrink-0 text-xs text-[var(--text-muted)] underline-offset-2 hover:underline"
            >
              {t("astroChatClear")}
            </button>
          ) : null}
        </div>
        {contextLine ? (
          <p className="mt-2 border border-[var(--brass)]/20 bg-[var(--brass)]/5 px-2 py-1.5 text-xs text-[var(--brass-soft)]">
            {contextLine}
          </p>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-muted)]">
              {t("astroChatStarters")}
            </p>
            <div className="flex flex-wrap gap-2">
              {defaultStarters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="border border-[var(--brass)]/35 px-3 py-2 text-left text-sm text-[var(--brass-soft)] transition hover:bg-[var(--brass)]/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`max-w-[90%] whitespace-pre-wrap text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-[var(--brass)]/15 px-3 py-2 text-[var(--text)]"
                : "text-[var(--text)]"
            }`}
          >
            {m.content || (busy && i === messages.length - 1 ? "…" : "")}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="px-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="flex gap-2 border-t border-[var(--hairline)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("astroChatPlaceholder")}
          disabled={busy}
          className="min-w-0 flex-1 border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--brass)]/45"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-[var(--brass)] px-4 py-2.5 text-sm text-[var(--on-brass)] disabled:opacity-40"
        >
          {busy ? "…" : t("astroChatSend")}
        </button>
      </form>
    </div>
  );
}
