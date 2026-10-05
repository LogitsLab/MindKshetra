import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import TransitsPageClient from "./TransitsPageClient";

// Server wrapper so this route can export metadata; the page itself is the
// client component next to it.
export const metadata: Metadata = pageMetadata({
  title: "Planetary transits (gochar) today",
  description:
    "Where the planets are today and how their transits (gochar) touch your Vedic birth chart, computed with the Swiss Ephemeris.",
  path: "/astrology/transits",
});

export default function Page() {
  return <TransitsPageClient />;
}
