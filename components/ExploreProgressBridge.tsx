"use client";

import { Suspense } from "react";
import ExplorePageClient from "@/components/ExplorePageClient";
import { useProgress } from "@/components/ProgressProvider";
import type { ChapterMeta } from "@/lib/chapters";

type Props = {
  chapters: ChapterMeta[];
};

function ExploreWithProgress({ chapters }: Props) {
  const { continueSlokaId } = useProgress();
  const continueHref = continueSlokaId
    ? `/sloka/${continueSlokaId}`
    : null;

  return (
    <ExplorePageClient chapters={chapters} continueHref={continueHref} />
  );
}

export default function ExploreProgressBridge({ chapters }: Props) {
  return (
    <Suspense fallback={<ExplorePageClient chapters={chapters} />}>
      <ExploreWithProgress chapters={chapters} />
    </Suspense>
  );
}
