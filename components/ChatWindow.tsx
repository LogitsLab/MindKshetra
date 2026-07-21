"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { CHAT_SESSION_KEY } from "@/components/AuthProvider";
import ChatMarkdown from "@/components/ChatMarkdown";
import SpeakButton from "@/components/SpeakButton";
import { stopSpeaking } from "@/lib/tts";

const INCOGNITO_KEY = "mindkshetra-chat-incognito";

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
  /** Fill parent height (Ask Madhav full-screen layout). */
  fullScreen?: boolean;
};

type ChatSessionSummary = {
  id: string;
  title: string | null;
  preview?: string | null;
  created_at: string;
  updated_at?: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function ChatWindow({
  initialPrompt,
  fullScreen = false,
}: Props) {
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
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(
    null
  );
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<ChatSessionSummary[]>(
    []
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const initialSent = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseInputRef = useRef("");
  const wantListenRef = useRef(false);
  const historyCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incognitoRef = useRef(false);

  const restoreSession = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/chat/sessions?sessionId=${encodeURIComponent(id)}`);
        if (!res.ok) return false;
        const data = (await res.json()) as {
          messages?: Array<{ role: "user" | "assistant"; content: string }>;
        };
        if (!data.messages?.length) return false;

        const restored: UiMessage[] = [
          welcome,
          ...data.messages.map((m, i) => ({
            id: `restored-${i}`,
            role: m.role,
            content: m.content,
          })),
        ];
        setMessages(restored);
        setSessionId(id);
        localStorage.setItem(CHAT_SESSION_KEY, id);
        return true;
      } catch {
        return false;
      }
    },
    [welcome]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedIncognito =
        typeof window !== "undefined" &&
        sessionStorage.getItem(INCOGNITO_KEY) === "1";
      if (storedIncognito) {
        setIncognito(true);
        incognitoRef.current = true;
        if (!cancelled) setRestoring(false);
        return;
      }
      const stored = localStorage.getItem(CHAT_SESSION_KEY);
      if (stored) {
        const ok = await restoreSession(stored);
        if (!cancelled && !ok) {
          localStorage.removeItem(CHAT_SESSION_KEY);
        }
      }
      if (!cancelled) setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  useEffect(() => {
    incognitoRef.current = incognito;
  }, [incognito]);

  useEffect(() => {
    if (!historyOpen) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setHistoryOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  const loadRecentSessions = useCallback(async () => {
    if (incognitoRef.current) {
      setRecentSessions([]);
      return;
    }
    try {
      const res = await fetch("/api/chat/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions?: ChatSessionSummary[] };
      setRecentSessions(data.sessions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const openHistory = useCallback(() => {
    if (historyCloseTimer.current) {
      clearTimeout(historyCloseTimer.current);
      historyCloseTimer.current = null;
    }
    setHistoryOpen(true);
    void loadRecentSessions();
  }, [loadRecentSessions]);

  const scheduleCloseHistory = useCallback(() => {
    if (historyCloseTimer.current) clearTimeout(historyCloseTimer.current);
    historyCloseTimer.current = setTimeout(() => {
      setHistoryOpen(false);
      historyCloseTimer.current = null;
    }, 150);
  }, []);

  const cancelCloseHistory = useCallback(() => {
    if (historyCloseTimer.current) {
      clearTimeout(historyCloseTimer.current);
      historyCloseTimer.current = null;
    }
  }, []);

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionCtor()));
    return () => {
      wantListenRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      if (historyCloseTimer.current) clearTimeout(historyCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === "hi" ? "hi-IN" : "en-IN";
    }
  }, [lang]);

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
    if (!stickToBottom.current) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = nearBottom;
  }

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const sendMessage = useCallback(
    async (text: string, baseMessages?: UiMessage[]) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      wantListenRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      stopSpeaking();
      setError(null);
      setLastFailedPrompt(null);
      setInput("");
      baseInputRef.current = "";
      stickToBottom.current = true;

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
          signal: controller.signal,
          body: JSON.stringify({
            language: lang,
            incognito: incognito || undefined,
            sessionId: incognito ? undefined : sessionId ?? undefined,
            messages: nextMessages
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : `Request failed (${res.status})`
          );
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
              sessionId?: string;
            };
            try {
              payload = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (payload.type === "session" && payload.sessionId) {
              if (!incognitoRef.current) {
                setSessionId(payload.sessionId);
                localStorage.setItem(CHAT_SESSION_KEY, payload.sessionId);
                void loadRecentSessions();
              }
            } else if (payload.type === "citations" && payload.citations) {
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
        if (err instanceof DOMException && err.name === "AbortError") {
          setMessages((prev) => {
            const currentMsg = prev.find((m) => m.id === assistantId);
            if (currentMsg?.content?.trim()) return prev;
            return prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id);
          });
          return;
        }
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
        setLastFailedPrompt(trimmed);
      } finally {
        setLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [loading, messages, lang, sessionId, incognito, loadRecentSessions]
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

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  function newChat() {
    abortRef.current?.abort();
    stopListening();
    stopSpeaking();
    setSessionId(null);
    if (!incognito) localStorage.removeItem(CHAT_SESSION_KEY);
    setMessages([welcome]);
    setError(null);
    setLastFailedPrompt(null);
    setHistoryOpen(false);
  }

  function clearChat() {
    newChat();
  }

  function toggleIncognito() {
    const next = !incognito;
    setIncognito(next);
    incognitoRef.current = next;
    try {
      if (next) sessionStorage.setItem(INCOGNITO_KEY, "1");
      else sessionStorage.removeItem(INCOGNITO_KEY);
    } catch {
      /* ignore */
    }
    if (next) {
      abortRef.current?.abort();
      stopListening();
      stopSpeaking();
      setSessionId(null);
      localStorage.removeItem(CHAT_SESSION_KEY);
      setMessages([welcome]);
      setError(null);
      setLastFailedPrompt(null);
      setRecentSessions([]);
      setHistoryOpen(false);
    }
  }

  async function switchSession(id: string) {
    if (incognito) return;
    if (id === sessionId) {
      setHistoryOpen(false);
      return;
    }
    abortRef.current?.abort();
    stopListening();
    stopSpeaking();
    setError(null);
    setLastFailedPrompt(null);
    const ok = await restoreSession(id);
    if (!ok) {
      setError(
        lang === "hi"
          ? "वार्ता लोड नहीं हो सकी।"
          : "Could not load that conversation."
      );
    }
    setHistoryOpen(false);
  }

  function stopGeneration() {
    abortRef.current?.abort();
    stopSpeaking();
  }

  function stopListening() {
    wantListenRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  function startListening() {
    if (loading) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(t("voiceUnsupported"));
      return;
    }

    stopListening();
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    baseInputRef.current = input.trim();
    wantListenRef.current = true;
    setError(null);
    setListening(true);

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += piece;
        else interimChunk += piece;
      }

      if (finalChunk) {
        const next = [baseInputRef.current, finalChunk.trim()]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        baseInputRef.current = next;
        setInput(next);
      } else if (interimChunk) {
        const next = [baseInputRef.current, interimChunk.trim()]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        setInput(next);
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "aborted" || code === "no-speech") return;
      if (code === "not-allowed") {
        setError(t("voiceError"));
      } else {
        setError(t("voiceError"));
      }
      wantListenRef.current = false;
      setListening(false);
    };

    recognition.onend = () => {
      if (wantListenRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
    };

    try {
      recognition.start();
      textareaRef.current?.focus();
    } catch {
      wantListenRef.current = false;
      setListening(false);
      setError(t("voiceError"));
    }
  }

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  function retryLast() {
    if (!lastFailedPrompt) return;
    void sendMessage(lastFailedPrompt);
  }

  const showStarters =
    !restoring &&
    messages.length <= 1 &&
    !loading &&
    !initialPrompt?.trim();

  const statusLabel = incognito ? t("incognitoOn") : null;

  const historyPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--hairline)] px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--brass-soft)]">
          {t("chatHistory")}
        </p>
        <button
          type="button"
          onClick={() => {
            newChat();
            setHistoryOpen(false);
          }}
          disabled={loading}
          className="text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50"
        >
          {t("newChat")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {incognito ? (
          <p className="px-2 py-3 text-sm leading-relaxed text-[var(--text-muted)]">
            {t("historyIncognitoHint")}
          </p>
        ) : recentSessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-[var(--text-muted)]">
            {t("noSavedChats")}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {recentSessions.map((s) => {
              const when = new Date(
                s.updated_at ?? s.created_at
              ).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              const headline =
                s.title?.trim() ||
                s.preview?.trim() ||
                (lang === "hi" ? "वार्ता" : "Conversation");
              const detail =
                s.preview?.trim() &&
                s.title?.trim() &&
                s.preview.trim() !== s.title.trim()
                  ? s.preview.trim()
                  : null;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => void switchSession(s.id)}
                    className={`w-full px-3 py-2.5 text-left transition hover:bg-[var(--surface)] ${
                      s.id === sessionId
                        ? "bg-[var(--surface)]"
                        : ""
                    }`}
                  >
                    <span
                      className={`block truncate text-sm leading-snug ${
                        s.id === sessionId
                          ? "text-[var(--brass-soft)]"
                          : "text-[var(--text)]"
                      }`}
                    >
                      {headline}
                    </span>
                    {detail ? (
                      <span className="mt-0.5 block line-clamp-2 text-xs font-light leading-snug text-[var(--text-muted)]">
                        {detail}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-[0.65rem] tracking-[0.04em] text-[var(--text-muted)]/80">
                      {when}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {incognito ? (
        <p className="border-t border-[var(--hairline)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
          {t("incognitoHint")}
        </p>
      ) : null}
    </div>
  );

  return (
    <div
      className={`relative flex flex-col overflow-hidden bg-[var(--panel-strong)] backdrop-blur-sm ${
        fullScreen
          ? "h-full min-h-0 border-0 shadow-none"
          : "h-full min-h-[26rem] border border-[var(--line)] shadow-[0_0_80px_rgba(61,122,106,0.08)] sm:min-h-[32rem]"
      }`}
    >
      {/* Visible history tab — hover or click to open (desktop) */}
      <button
        type="button"
        className={`absolute left-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 border border-l-0 border-[var(--brass)]/45 bg-[var(--panel-strong)] py-4 pl-1.5 pr-2 text-[var(--brass-soft)] shadow-[4px_0_20px_rgba(0,0,0,0.2)] transition hover:bg-[var(--surface)] hover:text-[var(--brass)] md:flex ${
          historyOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onMouseEnter={openHistory}
        onMouseLeave={scheduleCloseHistory}
        onClick={() => {
          if (historyOpen) setHistoryOpen(false);
          else openHistory();
        }}
        aria-label={t("openChatHistory")}
        title={t("historyHoverHint")}
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span
          className="text-[0.65rem] uppercase tracking-[0.16em]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {t("chatHistory")}
        </span>
      </button>

      {/* History sidebar */}
      <aside
        className={`absolute inset-y-0 left-0 z-40 flex w-[min(280px,85vw)] flex-col border-r border-[var(--line)] bg-[var(--panel-strong)] shadow-[8px_0_32px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out md:w-[280px] ${
          historyOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-full opacity-0"
        }`}
        onMouseEnter={() => {
          cancelCloseHistory();
          openHistory();
        }}
        onMouseLeave={scheduleCloseHistory}
        aria-hidden={!historyOpen}
      >
        {historyPanel}
      </aside>

      {/* Mobile overlay backdrop */}
      {historyOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close history"
          onClick={() => setHistoryOpen(false)}
        />
      ) : null}

      <div
        className={`flex items-center justify-between gap-3 border-b border-[var(--hairline)] py-3.5 ${
          fullScreen ? "px-4 sm:px-6" : "px-4 sm:px-7"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (historyOpen) setHistoryOpen(false);
              else openHistory();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] md:hidden"
            aria-label={t("chatHistory")}
            aria-expanded={historyOpen}
            title={t("historyHoverHint")}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 6h16M4 12h10M4 18h14" />
            </svg>
          </button>
          <Image
            src="/brand/madhav.jpg"
            alt=""
            width={32}
            height={32}
            className="hidden h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-[var(--brass)]/45 sm:block"
          />
          {statusLabel ? (
            <p
              className="truncate text-[11px] uppercase tracking-[0.14em] text-[var(--brass-soft)] sm:text-xs"
              title={t("incognitoHint")}
            >
              {statusLabel}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleIncognito}
            aria-pressed={incognito}
            className={`px-3 py-2 text-xs transition ${
              incognito
                ? "text-[var(--brass-soft)]"
                : "text-[var(--text-muted)] hover:text-[var(--brass-soft)]"
            }`}
            title={t("incognitoHint")}
          >
            {t("incognito")}
          </button>
          <button
            type="button"
            onClick={newChat}
            disabled={loading}
            className="px-3 py-2 text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50"
          >
            {t("newChat")}
          </button>
          {loading ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="px-3 py-2 text-xs text-[var(--brass-soft)] transition hover:text-[var(--brass)]"
            >
              {t("stop")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearChat}
            disabled={loading}
            className="hidden px-3 py-2 text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)] disabled:opacity-50 sm:inline"
          >
            {t("clearChat")}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-8 overflow-y-auto overscroll-contain px-5 py-6 sm:space-y-10 sm:px-8 sm:py-8"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {showStarters && (
          <div className="mb-2 flex flex-col items-center border-b border-[var(--hairline)] pb-8 pt-3 text-center sm:pb-10 sm:pt-4">
            <Image
              src="/brand/madhav.jpg"
              alt=""
              width={80}
              height={80}
              className="h-[4.5rem] w-[4.5rem] rounded-full object-cover opacity-95 ring-1 ring-[var(--brass)]/40 sm:h-20 sm:w-20"
              priority
            />
            <p className="mt-5 max-w-lg text-base font-light leading-relaxed text-[var(--text-muted)] sm:text-[17px] sm:leading-[1.75]">
              {t("madhavIntro")}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`break-words ${
              msg.role === "user"
                ? "ml-auto max-w-[min(92%,34rem)]"
                : "mr-auto max-w-[min(100%,52rem)]"
            }`}
          >
            <div
              className={`mb-2 flex items-center gap-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <Image
                  src="/brand/madhav.jpg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-[var(--brass)]/35"
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
              {msg.role === "assistant" && msg.content.trim() ? (
                <SpeakButton
                  text={msg.content}
                  lang={lang}
                  listenLabel={t("ttsListen")}
                  stopLabel={t("ttsStop")}
                  unsupportedLabel={t("ttsUnsupported")}
                  compact
                  className="ml-1 border border-[var(--line)]"
                />
              ) : null}
            </div>
            <div
              className={`px-5 py-5 text-base font-light leading-[1.8] break-words [overflow-wrap:anywhere] sm:px-6 sm:py-6 sm:text-[17px] sm:leading-[1.85] ${
                msg.role === "user"
                  ? "bg-[rgba(201,162,39,0.14)] text-[var(--text)] whitespace-pre-wrap"
                  : "border border-[var(--line)] bg-[var(--surface)] text-[var(--text)]"
              }`}
            >
              {msg.content ? (
                msg.role === "assistant" ? (
                  <ChatMarkdown content={msg.content} />
                ) : (
                  msg.content
                )
              ) : loading ? (
                <span className="text-[var(--text-muted)]">{t("reflecting")}</span>
              ) : (
                ""
              )}
            </div>
            {msg.role === "assistant" &&
              msg.citations &&
              msg.citations.length > 0 && (
                <div className="mt-4 space-y-3">
                  {msg.citations.slice(0, 3).map((c) => (
                    <Link
                      key={c.id}
                      href={`/sloka/${c.id}`}
                      className="block border border-[var(--line)] bg-[var(--input-bg)] px-4 py-4 text-[15px] transition hover:border-[var(--brass)]/40 sm:text-base"
                    >
                      <span className="text-[var(--brass-soft)]">{c.ref}</span>
                      <span className="mt-1 block line-clamp-2 font-light leading-relaxed text-[var(--text-muted)]">
                        {lang === "hi" && c.hindi ? c.hindi : c.english}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
          </div>
        ))}

        {showStarters && (
          <div className="flex flex-wrap gap-3 pt-2">
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void sendMessage(starter)}
                disabled={loading}
                className="min-h-12 border border-[var(--line)] px-4 py-3 text-left text-[15px] leading-snug text-[var(--text-muted)] transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] disabled:opacity-50 sm:text-base"
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--danger-bg)] px-4 py-2 text-sm text-[var(--danger)]">
          <span>{error}</span>
          {lastFailedPrompt ? (
            <button
              type="button"
              onClick={retryLast}
              className="shrink-0 text-[var(--brass-soft)] underline-offset-2 hover:underline"
            >
              {t("retry")}
            </button>
          ) : null}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-3 border-t border-[var(--line)] p-4 sm:gap-4 sm:p-6"
      >
        {voiceSupported ? (
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            aria-pressed={listening}
            aria-label={listening ? t("voiceStop") : t("voiceListen")}
            title={listening ? t("voiceStop") : t("voiceListen")}
            className={`relative flex min-h-11 min-w-11 shrink-0 items-center justify-center border transition disabled:cursor-not-allowed disabled:opacity-50 ${
              listening
                ? "border-[var(--brass)] bg-[rgba(201,162,39,0.22)] text-[var(--brass-soft)]"
                : "border-[var(--line)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)]"
            }`}
          >
            {listening ? (
              <span
                className="absolute inset-0 animate-pulse bg-[rgba(201,162,39,0.12)]"
                aria-hidden
              />
            ) : null}
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="relative"
            >
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <path d="M12 18v3" />
            </svg>
          </button>
        ) : null}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (!listening) baseInputRef.current = e.target.value;
          }}
          onKeyDown={onKeyDown}
          placeholder={
            listening ? t("voiceListening") : t("sharePlaceholder")
          }
          disabled={loading}
          rows={1}
          enterKeyHint="send"
          className="max-h-48 min-h-12 min-w-0 flex-1 resize-none border border-[var(--line)] bg-[var(--input-bg)] px-4 py-3.5 text-base text-[var(--text)] placeholder:text-[var(--text-muted)]/60 outline-none focus:border-[var(--brass)]/50 disabled:opacity-60 sm:text-[17px]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-12 shrink-0 bg-[var(--brass)] px-5 py-3.5 text-base font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
        >
          {loading ? "…" : t("send")}
        </button>
      </form>
    </div>
  );
}
