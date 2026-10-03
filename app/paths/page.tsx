import type { Metadata } from "next";
import PathsListClient from "@/components/PathsListClient";
import { listJourneysByKind } from "@/lib/journeys/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Bhagavad Gita paths: 7- and 21-day guided journeys",
  description:
    "Themed Gita journeys for anxiety, grief, purpose, relationships, restlessness and study: one verse, one short sit and one honest line a day.",
  path: "/paths",
});

export default function PathsPage() {
  const paths = listJourneysByKind("scripture");

  return (
    <div className="animate-fade">
      <PathsListClient paths={paths} />
    </div>
  );
}
