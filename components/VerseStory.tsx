"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  slokaId: number;
  passageLabel?: string;
};

type StoryResponse = {
  story: string | null;
  cached?: boolean;
  generated?: boolean;
  variant?: number;
  total?: number;
  language?: string;
  passage?: string | null;
  error?: string;
};

export default function VerseStory({ slokaId, passageLabel }: Props) {
  const { lang: appLang, t } = useLanguage();
  const [lang, setLang] = useState<"en" | "hi">(appLang);
  const [story, setStory] = useState<string | null>(null);
  const [variant, setVariant] = useState<number | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [passage, setPassage] = useState<string | undefined>(passageLabel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLang(appLang);
  }, [appLang]);

  useEffect(() => {
    setPassage(passageLabel);
  }, [passageLabel]);

  const loadCached = useCallback(async () => {
    try {
      const res = await fetch(`/api/slokas/${slokaId}/story?lang=${lang}`);
      const data = (await res.json()) as StoryResponse;
      if (data.passage) setPassage(data.passage);
      if (data.story) {
        setStory(data.story);
        setVariant(data.variant ?? 1);
        setTotal(data.total ?? 1);
      } else {
        setStory(null);
        setVariant(null);
        setTotal(0);
      }
    } catch {
      /* ignore prefetch errors */
    }
  }, [slokaId, lang]);

  useEffect(() => {
    setStory(null);
    setError(null);
    void loadCached();
  }, [loadCached]);

  async function requestStory(regenerate: boolean) {
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
      setStory(data.story);
      setVariant(data.variant ?? 1);
      setTotal(data.total ?? 1);
      if (data.passage) setPassage(data.passage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate story");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex h-full min-h-[24rem] flex-col bg-[rgba(14,20,32,0.55)] p-5 backdrop-blur-sm sm:p-7 lg:min-h-[min(72vh,40rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--brass-soft)]">
            {t("sidePath")}
          </p>
          <h2 className="mt-1 font-display text-xl text-[var(--text)] sm:text-2xl">
            {t("reflectiveStory")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {t("storyBlurb")}
          </p>
          {passage ? (
            <p className="mt-2 text-xs tracking-[0.12em] text-[var(--brass)]">
              {t("storyFromPassage")} {passage}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1 border border-[var(--line)] p-0.5">
          {(["en", "hi"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              disabled={loading}
              className={`px-2.5 py-1 text-xs uppercase tracking-[0.14em] transition ${
                lang === code
                  ? "bg-[var(--brass)] text-[var(--void)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {code === "en" ? t("langEn") : t("langHi")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto border-t border-white/[0.06] pt-5">
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
              {t("noStoryYet")}
            </p>
          </div>
        )}

        {variant && total > 0 && (
          <p className="mt-4 text-xs tracking-[0.12em] text-[var(--brass)]">
            {t("variantOf")} {variant} {t("of")} {total}
          </p>
        )}

        {error && <p className="mt-4 text-sm text-[#f0c4c8]">{error}</p>}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-white/[0.06] pt-5">
        {!story ? (
          <button
            type="button"
            onClick={() => requestStory(false)}
            disabled={loading}
            className="bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--void)] transition hover:bg-[var(--brass-soft)] disabled:opacity-50"
          >
            {loading ? t("writing") : t("generateStory")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => requestStory(true)}
              disabled={loading}
              className="border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--text)] transition hover:border-[var(--brass)]/50 hover:text-[var(--brass-soft)] disabled:opacity-50"
            >
              {loading
                ? t("writing")
                : total >= 3
                  ? t("nextVariant")
                  : t("refreshStory")}
            </button>
            <p className="w-full text-xs text-[var(--text-muted)]">
              {t("storyHint")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
