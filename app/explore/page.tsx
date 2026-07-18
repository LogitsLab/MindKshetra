import { Suspense } from "react";
import ExplorePageClient from "@/components/ExplorePageClient";
import { getChapterMetas } from "@/lib/chapters";

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageClient chapters={getChapterMetas()} />
    </Suspense>
  );
}
