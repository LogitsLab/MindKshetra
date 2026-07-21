import { Suspense } from "react";
import ExploreProgressBridge from "@/components/ExploreProgressBridge";
import { getChapterMetas } from "@/lib/chapters";

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreProgressBridge chapters={getChapterMetas()} />
    </Suspense>
  );
}
