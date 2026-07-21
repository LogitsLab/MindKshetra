"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import SpeakButton from "@/components/SpeakButton";
import ShareButton from "@/components/ShareButton";
import { useLanguage } from "@/components/LanguageProvider";
import { stopSpeaking } from "@/lib/tts";

type Props = {
  slokaId: number;
  passageLabel?: string;
  initialMode?: "teaching" | "scene";
  initialTitleEn?: string;
  initialTitleHi?: string;
};

type StoryResponse = {
  story: string | null;
  cached?: boolean;
  seeded?: boolean;
  curated?: boolean;
  generated?: boolean;
  variant?: number;
  total?: number;
  language?: string;
  passage?: string | null;
  mode?: "teaching" | "scene";
  titleEn?: string;
  titleHi?: string;
  error?: string;
};

export default function VerseStory({
  slokaId,
  passageLabel,
  initialMode = "teaching",
  initialTitleEn,
  initialTitleHi,
}: Props) {
  const { lang: appLang, t } = useLanguage();
  const [lang, setLang] = useState<"en" | "hi">(appLang);
  const [story, setStory] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [curated, setCurated] = useState(false);
  const [variant, setVariant] = useState<number | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [passage, setPassage] = useState<string | undefined>(passageLabel);
  const [mode, setMode] = useState<"teaching" | "scene">(initialMode);
  const [titleEn, setTitleEn] = useState<string | null>(initialTitleEn ?? null);
  const [titleHi, setTitleHi] = useState<string | null>(initialTitleHi ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLang(appLang);
  }, [appLang]);

  useEffect(() => {
    setPassage(passageLabel);
  }, [passageLabel]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialTitleEn) setTitleEn(initialTitleEn);
  }, [initialTitleEn]);

  useEffect(() => {
    if (initialTitleHi) setTitleHi(initialTitleHi);
  }, [initialTitleHi]);

  const applyResponse = useCallback((data: StoryResponse) => {
    if (data.passage) setPassage(data.passage);
    if (data.mode === "scene" || data.mode === "teaching") setMode(data.mode);
    if (data.titleEn) setTitleEn(data.titleEn);
    if (data.titleHi) setTitleHi(data.titleHi);
    if (data.story) {
      setStory(data.story);
      setSeeded(Boolean(data.seeded));
      setCurated(Boolean(data.curated));
      setVariant(data.variant ?? 1);
      setTotal(data.total ?? 1);
    } else {
      setStory(null);
      setSeeded(false);
      setCurated(false);
      setVariant(null);
      setTotal(0);
    }
  }, []);

  const loadCached = useCallback(async () => {
    try {
      const res = await fetch(`/api/slokas/${slokaId}/story?lang=${lang}`);
      const data = (await res.json()) as StoryResponse;
      applyResponse(data);
    } catch {
      /* ignore prefetch errors */
    }
  }, [slokaId, lang, applyResponse]);

  useEffect(() => {
    stopSpeaking();
    setStory(null);
    setError(null);
    void loadCached();
  }, [loadCached]);

  async function requestStory(regenerate: boolean) {
    stopSpeaking();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/slokas/${slokaId}/story?lang=${lang}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const data = (await res.json()) as StoryResponse;
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      if (!data.story) {
        throw new Error("No story returned");
      }
      applyResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate story");
    } finally {
      setLoading(false);
    }
  }

  const isScene = mode === "scene";
  const unitTitle =
    lang === "hi" ? titleHi || titleEn : titleEn || titleHi;

  return (
    <section className="flex h-full min-h-[24rem] flex-col bg-[var(--panel)] p-5 backdrop-blur-sm sm:p-7 lg:min-h-[min(72vh,40rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
            {isScene ? t("sidePathScene") : t("sidePath")}
          </p>
          <h2 className="mt-1 font-display text-xl text-[var(--text)] sm:text-2xl">
            {unitTitle || (isScene ? t("sceneTitle") : t("reflectiveStory"))}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {isScene ? t("sceneBlurb") : t("storyBlurb")}
          </p>
          {passage ? (
            <p className="mt-3 border border-[var(--line)] bg-black/20 px-3 py-2.5 text-sm leading-relaxed text-[var(--brass-soft)]">
              {(isScene ? t("sceneCoversRange") : t("storyCoversRange")).replace(
                "{range}",
                passage
              )}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1 border border-[var(--line)] p-0.5">
          {(["en", "hi"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                stopSpeaking();
                setLang(code);
              }}
              disabled={loading}
              className={`px-2.5 py-1 text-xs uppercase tracking-[0.14em] transition ${
                lang === code
                  ? "bg-[var(--brass)] text-[var(--on-brass)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {code === "en" ? t("langEn") : t("langHi")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto border-t border-[var(--hairline)] pt-5">
        {story ? (
          <p className="whitespace-pre-wrap text-[15px] font-light leading-[1.85] text-[var(--text)]">
            {story}
          </p>
        ) : (
          <div className="flex flex-col items-center py-6 text-center sm:items-start sm:text-left">
            <Image
              src="/ornaments/empty.svg"
              alt=""
              width={64}
              height={64}
              className="opacity-65"
            />
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {isScene ? t("noSceneYet") : t("noStoryYet")}
            </p>
          </div>
        )}

        {variant && total > 0 && (
          <p className="mt-4 text-xs tracking-[0.12em] text-[var(--brass)]">
            {curated
              ? t("sceneCuratedLabel")
              : seeded
                ? t("storyDefaultLabel")
                : `${t("variantOf")} ${variant} ${t("of")} ${total}`}
          </p>
        )}

        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--hairline)] pt-5">
        {story ? (
          <>
            <SpeakButton
              text={story}
              lang={lang}
              listenLabel={t("ttsListen")}
              stopLabel={t("ttsStop")}
              unsupportedLabel={t("ttsUnsupported")}
            />
            {!curated || isScene ? (
              <button
                type="button"
                onClick={() => requestStory(true)}
                disabled={loading}
                className="border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)] disabled:opacity-50"
              >
                {loading
                  ? t("writing")
                  : isScene
                    ? t("anotherSceneNote")
                    : total >= 3
                      ? t("nextVariant")
                      : t("refreshStory")}
              </button>
            ) : null}
            <ShareButton
              title={`MindKshetra ${slokaId} story`}
              text={story}
              url={
                typeof window !== "undefined"
                  ? `${window.location.origin}/sloka/${slokaId}`
                  : `/sloka/${slokaId}`
              }
              imageUrl={`/api/og/story/${slokaId}?lang=${lang}`}
            />
            <p className="w-full text-xs text-[var(--text-muted)]">
              {isScene ? t("sceneHint") : t("storyHint")}
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => requestStory(false)}
            disabled={loading}
            className="bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)] disabled:opacity-50"
          >
            {loading
              ? t("writing")
              : isScene
                ? t("showSceneNote")
                : t("generateStory")}
          </button>
        )}
      </div>
    </section>
  );
}
