import type { Metadata } from "next";
import MeditationLibraryClient from "@/components/MeditationLibraryClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sleep sounds",
  description:
    "Four public-domain sleep beds and a seven-evening wind-down. Not a sleep clinic.",
  path: "/meditation/library",
});

export default function MeditationLibraryPage() {
  return (
    <div className="animate-fade">
      <MeditationLibraryClient />
    </div>
  );
}

