import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import AstrologyPageClient from "./AstrologyPageClient";

// Server wrapper so this route can export metadata; the page itself is the
// client component next to it.
export const metadata: Metadata = pageMetadata({
  title: "Free Vedic birth chart (kundli) with Gita guidance",
  description:
    "Cast a free Vedic birth chart (kundli) from your birth date, time and place, computed with the Swiss Ephemeris, and read it alongside Bhagavad Gita verses.",
  path: "/astrology",
});

export default function Page() {
  return <AstrologyPageClient />;
}
