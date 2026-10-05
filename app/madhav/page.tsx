import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import MadhavPageClient from "./MadhavPageClient";

// Server wrapper so this route can export metadata; the page itself is the
// client component next to it.
export const metadata: Metadata = pageMetadata({
  title: "Ask Madhav: Bhagavad Gita guidance that cites real verses",
  description:
    "Ask Madhav your question and get guidance grounded in Bhagavad Gita verses, with chapter and verse cited. Free, in English or Hindi. Not a substitute for care.",
  path: "/madhav",
});

export default function Page() {
  return <MadhavPageClient />;
}
