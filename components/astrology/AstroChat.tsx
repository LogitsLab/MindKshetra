"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { postChat, readChatStream } from "@/lib/chat-stream";

export type AstroChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  memberId?: string;
  /** Incognito chart session. See lib/astrology/incognito.ts for the naming. */
  chartSessionId?: string;
  birth?: Record<string, unknown>;
  starters?: string[];
  contextLine?: string;
  /** Controlled message list — when set with onMessagesChange, parent owns history */
  messages?: AstroChatMessage[];
  onMessagesChange?: (messages: AstroChatMessage[]) => void;
  className?: string;
};

export default function AstroChat({
  memberId,
  chartSessionId,
  birth,
  starters,
  contextLine,
  messages: controlledMessages,
  onMessagesChange,
  className = "",
}: Props) {
  const { t, lang } = useLanguage();
  const [internalMessages, setInternalMessages] = useState<AstroChatMessage[]>(
    []
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  const controlled = controlledMessages !== undefined && onMessagesChange;
  const messages = controlled ? controlledMessages : internalMessages;

  function setMessages(next: AstroChatMessage[]) {
    if (controlled) onMessagesChange!(next);
    else setInternalMessages(next);
  }

  const defaultStarters =
    starters ||
    (lang === "hi"
      ? [
          "मेरी वर्तमान दशा अभी क्या खोल रही है?",
          "करियर के लिए इस कुंडली में क्या मजबूत है — भाव सहित बताएँ?",
          "रिश्ते भाव को इस कुंडली से कैसे पढ़ें?",
        ]
      : [
          "What is my current dasha asking of me right now?",
          "What supports career in this chart — cite the houses?",
          "How should I read relationships from this chart?",
        ]);

  useEffect(() => {
    if (!nearBottom.current) return;
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, busy]);

  function onListScroll() {
    const el = listRef.current;
    if (!el) return;
    const pad = 72;
    nearBottom.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - pad;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    const nextMessages: AstroChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    nearBottom.current = true;

    try {
      const res = await postChat({
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        language: lang,
        memberId,
        chartSessionId,
        birth,
        incognito: true,
      });

      let assistant = "";
      const paint = () =>
        setMessages([
          ...nextMessages,
          { role: "assistant", content: assistant },
        ]);
      paint();

      for await (const ev of readChatStream(res.body!)) {
        if (ev.type === "token" && ev.content) {
          assistant += ev.content;
          paint();
        } else if (ev.type === "replace" && ev.content) {
          assistant = ev.content;
          paint();
        } else if (ev.type === "error") {
          throw new Error(ev.error);
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
    <div
      className={`flex h-[min(70vh,36rem)] min-h-[28rem] flex-col border border-[var(--line)] ${className}`}
    >
      <div className="shrink-0 border-b border-[var(--hairline)] px-4 py-3">
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

      <div
        ref={listRef}
        onScroll={onListScroll}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
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
          <div key={`${m.role}-${i}`} className="max-w-[90%]">
            <div
              className={`whitespace-pre-wrap text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-[var(--brass)]/15 px-3 py-2 text-[var(--text)]"
                  : "text-[var(--text)]"
              }`}
            >
              {m.content || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="shrink-0 px-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="flex shrink-0 gap-2 border-t border-[var(--hairline)] p-3"
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
