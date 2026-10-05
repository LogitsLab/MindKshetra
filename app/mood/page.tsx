import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import MoodPageClient from "./MoodPageClient";

// Server wrapper so this route can export metadata; the page itself is the
// client component next to it.
export const metadata: Metadata = pageMetadata({
  title: "Bhagavad Gita verses for how you feel",
  description:
    "Choose how you feel (anxious, sad, angry, lost or grieving) and read Bhagavad Gita verses that meet you there, with Sanskrit, Hindi and English meaning.",
  path: "/mood",
});

export default function Page() {
  return <MoodPageClient />;
}
