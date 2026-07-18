import ExplorePageClient from "@/components/ExplorePageClient";
import { getChapterMetas } from "@/lib/chapters";

export default function ExplorePage() {
  return <ExplorePageClient chapters={getChapterMetas()} />;
}
