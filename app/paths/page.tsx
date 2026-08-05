import type { Metadata } from "next";
import PathsListClient from "@/components/PathsListClient";
import { listJourneysByKind } from "@/lib/journeys/content";

export const metadata: Metadata = {
  title: "Paths · MindKshetra",
  description:
    "Themed multi-day journeys of verse, sit, and one honest line a day.",
};

export default function PathsPage() {
  const paths = listJourneysByKind("scripture");

  return (
    <div className="animate-fade">
      <PathsListClient paths={paths} />
    </div>
  );
}
