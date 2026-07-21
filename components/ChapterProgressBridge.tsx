"use client";

import { useMemo } from "react";
import ChapterPageClient from "@/components/ChapterPageClient";
import { useProgress } from "@/components/ProgressProvider";
import type { ChapterMeta } from "@/lib/chapters";
import type { Sloka } from "@/lib/types";

type Props = {
  chapter: number;
  meta?: ChapterMeta;
  slokas: Sloka[];
};

export default function ChapterProgressBridge({
  chapter,
  meta,
  slokas,
}: Props) {
  const { completedIds, continueSlokaId, cursorSlokaId, markManyComplete } =
    useProgress();

  const completedList = useMemo(
    () => Array.from(completedIds),
    [completedIds]
  );

  const continueHref = useMemo(() => {
    const inChapter = slokas.find((s) => s.id === continueSlokaId);
    if (inChapter) return `/sloka/${inChapter.id}`;
    const cursorInChapter = slokas.find((s) => s.id === cursorSlokaId);
    if (cursorInChapter && !completedIds.has(cursorInChapter.id)) {
      return `/sloka/${cursorInChapter.id}`;
    }
    const firstIncomplete = slokas.find((s) => !completedIds.has(s.id));
    if (firstIncomplete) return `/sloka/${firstIncomplete.id}`;
    if (slokas[0]) return `/sloka/${slokas[0].id}`;
    return null;
  }, [slokas, continueSlokaId, cursorSlokaId, completedIds]);

  return (
    <ChapterPageClient
      chapter={chapter}
      meta={meta}
      slokas={slokas}
      completedIds={completedList}
      onContinueHref={continueHref}
      onMarkUnitComplete={(ids, completed) => {
        void markManyComplete(ids, completed);
      }}
    />
  );
}
