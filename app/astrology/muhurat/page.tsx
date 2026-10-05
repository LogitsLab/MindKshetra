import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import MuhuratPageClient from "./MuhuratPageClient";

// Server wrapper so this route can export metadata; the page itself is the
// client component next to it.
export const metadata: Metadata = pageMetadata({
  title: "Today's muhurat and choghadiya timings",
  description:
    "Today's auspicious muhurats and choghadiya periods for your location, with good, neutral and avoid windows computed at local sunrise.",
  path: "/astrology/muhurat",
});

export default function Page() {
  return <MuhuratPageClient />;
}
