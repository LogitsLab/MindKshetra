import { notFound } from "next/navigation";
import SlokaPageClient from "@/components/SlokaPageClient";
import { getChapterMeta } from "@/lib/chapters";
import {
  rankRelatedSlokas,
  toRelatedVersePreview,
} from "@/lib/sloka-utils";
import {
  getAdjacentSlokas,
  getAllSlokas,
  getSlokaById,
  getSlokasByTags,
  getTeachingPassage,
} from "@/lib/slokas";

type Props = { params: { id: string } };

// Verse content is immutable; pre-rendering all 701 pages makes navigation
// (and Link prefetch) instant instead of a cold SSR round-trip per click.
// Progress/favorites are client bridges, so nothing here is per-user.
// force-static: DB-mode content fetches are no-store, which otherwise
// silently demotes these pages to dynamic at build persist time (the route
// table still shows ● but the prerender manifest stays empty).
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const all = await getAllSlokas();
  return all.map((sloka) => ({ id: String(sloka.id) }));
}

export default async function SlokaPage({ params }: Props) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const sloka = await getSlokaById(id);
  if (!sloka) notFound();

  const [{ prev, next }, passage, tagMatches] = await Promise.all([
    getAdjacentSlokas(id),
    getTeachingPassage(id),
    sloka.tags.length > 0 ? getSlokasByTags(sloka.tags) : Promise.resolve([]),
  ]);

  // Related-verse interlinks ride the static prerender (SEO + engagement):
  // ranked server-side by shared-tag overlap, serialized as slim previews.
  const related = rankRelatedSlokas(sloka, tagMatches).map(
    toRelatedVersePreview
  );

  return (
    <SlokaPageClient
      sloka={sloka}
      chapterMeta={getChapterMeta(sloka.chapter)}
      prev={prev}
      next={next}
      passage={passage}
      related={related}
    />
  );
}
