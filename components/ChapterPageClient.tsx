"use client";

import Image from "next/image";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import SlokaCard from "@/components/SlokaCard";
import { useLanguage } from "@/components/LanguageProvider";
import { chapterMoral, type ChapterMeta } from "@/lib/chapters";
import {
  formatUnitRange,
  getUnitsForChapter,
  type PassageUnit,
} from "@/lib/passages";
import type { Sloka } from "@/lib/types";

type Props = {
  chapter: number;
  meta?: ChapterMeta;
  slokas: Sloka[];
  /** Completed verse ids for checkmarks (optional). */
  completedIds?: number[];
  onContinueHref?: string | null;
  onMarkUnitComplete?: (slokaIds: number[], completed: boolean) => void;
};

type UnitGroup = {
  unit: PassageUnit | null;
  slokas: Sloka[];
};

function groupByUnits(chapter: number, slokas: Sloka[]): UnitGroup[] {
  const units = getUnitsForChapter(chapter);
  if (!units.length) {
    return [{ unit: null, slokas }];
  }
  return units
    .map((unit) => ({
      unit,
      slokas: slokas.filter(
        (s) => s.verse_number >= unit.from && s.verse_number <= unit.to
      ),
    }))
    .filter((g) => g.slokas.length > 0);
}

export default function ChapterPageClient({
  chapter,
  meta,
  slokas,
  completedIds = [],
  onContinueHref = null,
  onMarkUnitComplete,
}: Props) {
  const { lang, t } = useLanguage();
  const showJump = slokas.length >= 40;
  const groups = groupByUnits(chapter, slokas);
  const completedSet = new Set(completedIds);
  const doneCount = slokas.filter((s) => completedSet.has(s.id)).length;

  return (
    <div className="animate-fade">
      <Link
        href="/explore"
        className="text-sm text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
      >
        {t("allChapters")}
      </Link>
      <header className="relative mt-4 max-w-2xl">
        <Image
          src="/ornaments/chapter.svg"
          alt=""
          width={100}
          height={100}
          className="pointer-events-none absolute -right-2 -top-4 opacity-20 sm:right-0"
        />
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brass-soft)]">
          {t("chapter")} {chapter}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--text)] sm:text-5xl">
          {lang === "hi"
            ? meta?.name_sanskrit ?? `${t("chapter")} ${chapter}`
            : meta?.name ?? `${t("chapter")} ${chapter}`}
        </h1>
        {meta && (
          <p className="mt-2 font-display text-xl text-[var(--text-muted)]">
            {lang === "hi" ? meta.name : meta.name_sanskrit}
          </p>
        )}
        {meta?.summary && (
          <p className="mt-4 text-sm font-light leading-relaxed text-[var(--text-muted)]">
            {meta.summary}
          </p>
        )}
        {chapterMoral(meta, lang) ? (
          <div className="mt-5 border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--brass-soft)]">
              {t("chapterMoral")}
            </p>
            <p className="mt-2 font-display text-lg leading-snug text-[var(--text)]">
              {chapterMoral(meta, lang)}
            </p>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--brass)]">
          <span>
            {slokas.length} {slokas.length === 1 ? t("verse") : t("verses")}
          </span>
          {slokas.length > 0 ? (
            <span className="text-[var(--text-muted)]">
              · {doneCount}/{slokas.length} {t("progressComplete")}
            </span>
          ) : null}
        </div>
        {onContinueHref ? (
          <Link
            href={onContinueHref}
            className="mt-4 inline-flex min-h-11 items-center bg-[var(--brass)] px-4 py-2.5 text-sm font-medium text-[var(--on-brass)] transition hover:bg-[var(--brass-hover)]"
          >
            {t("continueReading")}
          </Link>
        ) : null}
      </header>

      {showJump && (
        <div className="mt-8">
          <p className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t("jumpToVerse")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {slokas.map((sloka) => (
              <a
                key={sloka.id}
                href={`#verse-${sloka.verse_number}`}
                className={`inline-flex min-h-9 min-w-9 items-center justify-center border px-2 text-xs transition hover:border-[var(--brass)]/45 hover:text-[var(--brass-soft)] ${
                  completedSet.has(sloka.id)
                    ? "border-[var(--brass)]/50 text-[var(--brass-soft)]"
                    : "border-[var(--line)] text-[var(--text-muted)]"
                }`}
              >
                {sloka.verse_number}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 space-y-12">
        {groups.length > 0 ? (
          groups.map((group) => {
            const unit = group.unit;
            const first = group.slokas[0];
            const unitDone = group.slokas.filter((s) =>
              completedSet.has(s.id)
            ).length;
            return (
              <section
                key={unit?.id ?? `loose-${first?.id}`}
                className="space-y-4"
              >
                {unit ? (
                  <header className="border-b border-[var(--hairline)] pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl text-[var(--text)]">
                        {lang === "hi" ? unit.titleHi : unit.titleEn}
                      </h2>
                      <span className="border border-[var(--line)] px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--brass-soft)]">
                        {unit.mode === "scene"
                          ? t("unitBadgeScene")
                          : t("unitBadgeTeaching")}
                      </span>
                      <span className="text-xs tracking-[0.08em] text-[var(--text-muted)]">
                        {formatUnitRange(unit)}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        · {unitDone}/{group.slokas.length}
                      </span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm font-light leading-relaxed text-[var(--text-muted)]">
                      {lang === "hi" ? unit.themeHi : unit.themeEn}
                    </p>
                    {first ? (
                      <Link
                        href={`/sloka/${first.id}#reflection`}
                        className="mt-3 inline-flex text-sm text-[var(--brass-soft)] transition hover:text-[var(--brass)]"
                      >
                        {t("readUnitReflection")} →
                      </Link>
                    ) : null}
                    {onMarkUnitComplete && group.slokas.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          onMarkUnitComplete(
                            group.slokas.map((s) => s.id),
                            unitDone < group.slokas.length
                          )
                        }
                        className="ml-4 mt-3 inline-flex text-xs text-[var(--text-muted)] transition hover:text-[var(--brass-soft)]"
                      >
                        {unitDone === group.slokas.length
                          ? t("markIncomplete")
                          : t("markUnitComplete")}
                      </button>
                    ) : null}
                  </header>
                ) : null}
                <div className="grid gap-3">
                  {group.slokas.map((sloka) => (
                    <div
                      key={sloka.id}
                      id={`verse-${sloka.verse_number}`}
                      className="scroll-mt-28"
                    >
                      <SlokaCard
                        sloka={sloka}
                        showChapter={false}
                        completed={completedSet.has(sloka.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <EmptyState title={t("noSearchResults")} />
        )}
      </div>
    </div>
  );
}
