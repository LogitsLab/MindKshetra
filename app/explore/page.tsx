import type { Metadata } from "next";
import ExploreProgressBridge from "@/components/ExploreProgressBridge";
import JsonLd from "@/components/JsonLd";
import { chapterRomanizedName, getChapterMetas } from "@/lib/chapters";
import {
  breadcrumbNode,
  gitaBookNode,
  pageMetadata,
  publisherRef,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Bhagavad Gita: all 18 chapters and 701 verses",
  description:
    "Read the Bhagavad Gita chapter by chapter, with Sanskrit, IAST transliteration, Hindi and English translation and word-by-word meaning for all 701 verses.",
  path: "/explore",
});

export default function ExplorePage() {
  const chapters = getChapterMetas();
  const pageUrl = absoluteUrl("/explore");

  return (
    <>
      <JsonLd
        graph={[
          {
            "@type": "CollectionPage",
            "@id": `${pageUrl}#webpage`,
            url: pageUrl,
            name: "Bhagavad Gita: all 18 chapters and 701 verses",
            inLanguage: "en",
            isPartOf: { "@id": `${absoluteUrl()}/#website` },
            about: { "@id": gitaBookNode()["@id"] },
            breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
            publisher: publisherRef(),
          },
          {
            ...gitaBookNode(),
            hasPart: chapters.map((c) => ({
              "@type": "Chapter",
              "@id": `${absoluteUrl(`/explore/${c.number}`)}#chapter`,
              position: c.number,
              name: `Chapter ${c.number}: ${chapterRomanizedName(c)}`,
              alternateName: [c.name, c.name_sanskrit],
              url: absoluteUrl(`/explore/${c.number}`),
            })),
          },
          breadcrumbNode("/explore", [
            { name: "MindKshetra", path: "/" },
            { name: "Bhagavad Gita" },
          ]),
        ]}
      />
      {/* No outer Suspense: the bridge has its own, and ExploreSearch is the
          only URL reader, inside its own boundary. */}
      <ExploreProgressBridge chapters={chapters} />
    </>
  );
}
