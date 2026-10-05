import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import HoroscopePageClient from "./HoroscopePageClient";

// Server wrapper so this route can export metadata; the page itself is the
// client component next to it.
export const metadata: Metadata = pageMetadata({
  title: "Vedic horoscope from your birth chart",
  description:
    "Horoscope insights narrated from your own chart (dashas, transits and houses), never invented placements, with a Gita verse for each theme.",
  path: "/astrology/horoscope",
});

export default function Page() {
  return <HoroscopePageClient />;
}
